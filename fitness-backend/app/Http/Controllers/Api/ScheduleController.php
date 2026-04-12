<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SessionRequest;
use App\Models\Booking;
use App\Models\Client;
use App\Models\GroupSession;
use App\Models\Hall;
use App\Models\PersonalSession;
use App\Models\Session;
use App\Models\Trainer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    /**
     * GET /api/v1/schedule
     * Расписание с фильтрацией по дате, тренеру, типу.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Session::with(['hall', 'trainer.person', 'groupSession', 'personalSession.client.person'])
            ->orderBy('starts_at');

        // Фильтр по дате (по умолчанию — сегодня)
        if ($date = $request->query('date')) {
            $query->whereDate('starts_at', $date);
        }

        // Фильтр по тренеру
        if ($trainerId = $request->query('trainer_id')) {
            $query->where('trainer_id', $trainerId);
        }

        // Фильтр по залу
        if ($hallId = $request->query('hall_id')) {
            $query->where('hall_id', $hallId);
        }

        // Фильтр по типу (group / personal)
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        // Фильтр по статусу
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Если дата не указана — показываем ближайшие 7 дней
        if (!$request->query('date')) {
            $query->whereDate('starts_at', '>=', now()->toDateString())
                ->whereDate('starts_at', '<=', now()->addDays(7)->toDateString());
        }

        $sessions = $query->get();

        // Сортировка по свободным местам (только для групповых)
        $sortSlots = $request->query('sort_slots'); // 'asc' | 'desc'
        if ($sortSlots === 'asc' || $sortSlots === 'desc') {
            $sessions = $sessions->sortBy(function ($s) {
                if ($s->type !== 'group' || !$s->groupSession) {
                    return PHP_INT_MAX; // непосредственно групповые в конец
                }
                return $s->groupSession->getAvailableSlots();
            }, SORT_REGULAR, $sortSlots === 'desc')->values();
        }

        return response()->json([
            'data' => $sessions->map(fn ($s) => $this->formatSession($s)),
        ]);
    }

    /**
     * GET /api/v1/schedule/{id}
     * Детали занятия с записями.
     */
    public function show(int $id): JsonResponse
    {
        $session = Session::with([
            'hall',
            'trainer.person',
            'groupSession',
            'personalSession.client.person',
            'bookings.client.person',
        ])->findOrFail($id);

        $data = $this->formatSession($session);

        // Добавляем список записавшихся
        $data['bookings'] = $session->bookings->map(fn ($b) => [
            'id'        => $b->id,
            'client_id' => $b->client_id,
            'client_name' => $b->client->person->full_name,
            'status'    => $b->status,
            'created_at' => $b->created_at->toDateTimeString(),
        ]);

        return response()->json(['data' => $data]);
    }

    /**
     * POST /api/v1/schedule
     * Создать занятие (групповое или персональное).
     */
    public function store(SessionRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Проверка конфликтов по залу
        if (isset($data['hall_id'])) {
            $conflict = Session::where('hall_id', $data['hall_id'])
                ->where('status', '!=', 'cancelled')
                ->where(function ($q) use ($data) {
                    $q->where('starts_at', '<', $data['ends_at'])
                        ->where('ends_at', '>', $data['starts_at']);
                })->exists();

            if ($conflict) {
                return response()->json([
                    'message' => 'Зал занят в это время',
                ], 409);
            }
        }

        // Проверка конфликтов по тренеру
        if (isset($data['trainer_id'])) {
            $trainerConflict = Session::where('trainer_id', $data['trainer_id'])
                ->where('status', '!=', 'cancelled')
                ->where(function ($q) use ($data) {
                    $q->where('starts_at', '<', $data['ends_at'])
                        ->where('ends_at', '>', $data['starts_at']);
                })->exists();

            if ($trainerConflict) {
                return response()->json([
                    'message' => 'У тренера уже есть занятие в это время',
                ], 409);
            }
        }

        // Создаём базовое занятие
        $session = Session::create([
            'hall_id'    => $data['hall_id'] ?? null,
            'trainer_id' => $data['trainer_id'] ?? null,
            'starts_at'  => $data['starts_at'],
            'ends_at'    => $data['ends_at'],
            'status'     => 'scheduled',
            'notes'      => $data['notes'] ?? null,
            'type'       => $data['type'],
        ]);

        // Создаём расширение
        if ($data['type'] === 'group') {
            GroupSession::create([
                'session_id'       => $session->id,
                'name'             => $data['name'],
                'difficulty_level' => $data['difficulty_level'] ?? null,
                'max_participants' => $data['max_participants'],
            ]);
        } else {
            PersonalSession::create([
                'session_id' => $session->id,
                'client_id'  => $data['client_id'],
            ]);
        }

        $session->load(['hall', 'trainer.person', 'groupSession', 'personalSession.client.person']);

        return response()->json([
            'message' => 'Занятие создано',
            'data'    => $this->formatSession($session),
        ], 201);
    }

    /**
     * PUT /api/v1/schedule/{id}
     * Обновить занятие.
     */
    public function update(SessionRequest $request, int $id): JsonResponse
    {
        $session = Session::findOrFail($id);
        $data = $request->validated();

        $session->update(array_filter([
            'hall_id'    => $data['hall_id'] ?? null,
            'trainer_id' => $data['trainer_id'] ?? null,
            'starts_at'  => $data['starts_at'] ?? null,
            'ends_at'    => $data['ends_at'] ?? null,
            'notes'      => $data['notes'] ?? null,
        ], fn ($v) => $v !== null));

        // Обновить расширение если групповое
        if ($session->type === 'group' && $session->groupSession) {
            $session->groupSession->update(array_filter([
                'name'             => $data['name'] ?? null,
                'difficulty_level' => $data['difficulty_level'] ?? null,
                'max_participants' => $data['max_participants'] ?? null,
            ], fn ($v) => $v !== null));
        }

        $session->load(['hall', 'trainer.person', 'groupSession', 'personalSession.client.person']);

        return response()->json([
            'message' => 'Занятие обновлено',
            'data'    => $this->formatSession($session),
        ]);
    }

    /**
     * POST /api/v1/schedule/auto-complete
     * Завершить все прошедшие занятия со статусом «scheduled».
     * Вызывается один раз при открытии вкладки расписания администратором.
     */
    public function autoComplete(): JsonResponse
    {
        $updated = Session::where('status', 'scheduled')
            ->where('ends_at', '<', now())
            ->update(['status' => 'completed']);

        return response()->json(['updated' => $updated]);
    }

    /**
     * POST /api/v1/schedule/{id}/cancel
     * Отменить занятие.
     */
    public function cancel(int $id): JsonResponse
    {
        $session = Session::findOrFail($id);

        if ($session->status === 'cancelled') {
            return response()->json(['message' => 'Занятие уже отменено'], 409);
        }

        $session->update(['status' => 'cancelled']);

        // Отменяем все записи на это занятие
        $session->bookings()
            ->whereIn('status', ['booked', 'confirmed'])
            ->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Занятие отменено']);
    }

    /**
     * GET /api/v1/halls
     */
    public function halls(): JsonResponse
    {
        $halls = Hall::where('is_active', true)->get();

        return response()->json([
            'data' => $halls->map(fn ($h) => [
                'id'       => $h->id,
                'number'   => $h->number,
                'type'     => $h->type,
                'capacity' => $h->capacity,
            ]),
        ]);
    }

    /**
     * GET /api/v1/trainers
     */
    public function trainers(): JsonResponse
    {
        $trainers = Trainer::with('person')->get();

        return response()->json([
            'data' => $trainers->map(fn ($t) => [
                'id'             => $t->person_id,
                'full_name'      => $t->person->full_name,
                'specialization' => $t->specialization,
                'phone'          => $t->contact_phone,
                'description'    => $t->description,
            ]),
        ]);
    }

    /**
     * Форматирование занятия для JSON.
     */
    private function formatSession(Session $session): array
    {
        $data = [
            'id'         => $session->id,
            'type'       => $session->type,
            'starts_at'  => $session->starts_at->toDateTimeString(),
            'ends_at'    => $session->ends_at->toDateTimeString(),
            'date'       => $session->starts_at->toDateString(),
            'time_start' => $session->starts_at->format('H:i'),
            'time_end'   => $session->ends_at->format('H:i'),
            'duration'   => $session->getDurationMinutes(),
            'status'     => $session->status,
            'notes'      => $session->notes,
            'hall'       => $session->hall ? [
                'id'     => $session->hall->id,
                'number' => $session->hall->number,
                'type'   => $session->hall->type,
            ] : null,
            'trainer' => $session->trainer ? [
                'id'        => $session->trainer->person_id,
                'full_name' => $session->trainer->person->full_name,
            ] : null,
        ];

        if ($session->type === 'group' && $session->groupSession) {
            $gs = $session->groupSession;
            $data['name']             = $gs->name;
            $data['difficulty_level'] = $gs->difficulty_level;
            $data['max_participants'] = $gs->max_participants;
            $data['registered']       = $gs->getRegisteredCount();
            $data['available_slots']  = $gs->getAvailableSlots();
        }

        if ($session->type === 'personal' && $session->personalSession) {
            $ps = $session->personalSession;
            $data['client'] = [
                'id'        => $ps->client_id,
                'full_name' => $ps->client->person->full_name ?? null,
            ];
        }

        // Проверяем, записан ли текущий пользователь (если это клиент)
        $clientBooking = null;
        if (auth()->check() && auth()->user()->roles()->where('name', 'client')->exists()) {
            $client = Client::where('person_id', auth()->user()->id)->first();
            if ($client) {
                $clientBooking = Booking::where('client_id', $client->person_id)
                    ->where('session_id', $session->id)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->first();
            }
        }
        $data['client_booking'] = $clientBooking ? [
            'id' => $clientBooking->id,
            'status' => $clientBooking->status,
        ] : null;

        return $data;
    }
}
