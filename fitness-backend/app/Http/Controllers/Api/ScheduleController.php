<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SessionRequest;
use App\Models\Booking;
use App\Models\Client;
use App\Models\GroupSession;
use App\Models\Hall;
use App\Models\Payment;
use App\Models\PersonalSession;
use App\Models\Session;
use App\Models\Trainer;
use Carbon\Carbon;
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

        // ── Проверки для персонального занятия ──────────────────────────
        if (($data['type'] ?? null) === 'personal' && isset($data['client_id'])) {
            $clientForCheck = Client::with('memberships')->findOrFail($data['client_id']);

            // Требуем активный абонемент
            if (!$clientForCheck->getActiveMembership()) {
                return response()->json([
                    'message' => 'У клиента нет активного абонемента. Запись на персональное занятие невозможна.',
                ], 422);
            }

            // Проверка баланса при оплате с баланса
            $paymentMethod = $data['payment_method'] ?? 'cash';
            if ($paymentMethod === 'balance') {
                $sessionCost = $this->calcSessionCost($data);
                if ((float) $clientForCheck->balance < $sessionCost) {
                    return response()->json([
                        'message' => "Недостаточно средств на балансе. Баланс: {$clientForCheck->balance} ₽, стоимость: {$sessionCost} ₽",
                    ], 422);
                }
            }
        }

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

        // Проверка конфликтов по клиенту (персональное занятие)
        if (($data['type'] ?? null) === 'personal' && isset($data['client_id'])) {
            // Уже является участником персонального занятия в это время?
            $personalConflict = Session::whereHas('personalSession', function ($q) use ($data) {
                    $q->where('client_id', $data['client_id']);
                })
                ->where('status', '!=', 'cancelled')
                ->where(function ($q) use ($data) {
                    $q->where('starts_at', '<', $data['ends_at'])
                        ->where('ends_at', '>', $data['starts_at']);
                })->exists();

            // Уже записан на групповое занятие в это время?
            $bookingConflict = Booking::where('client_id', $data['client_id'])
                ->whereIn('status', ['pending', 'confirmed'])
                ->whereHas('session', function ($q) use ($data) {
                    $q->where('status', '!=', 'cancelled')
                        ->where('starts_at', '<', $data['ends_at'])
                        ->where('ends_at', '>', $data['starts_at']);
                })->exists();

            if ($personalConflict || $bookingConflict) {
                return response()->json([
                    'message' => 'У клиента уже есть занятие в это время',
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
            $client = Client::findOrFail($data['client_id']);
            $paymentMethod = $data['payment_method'] ?? 'cash';
            $sessionCost   = $this->calcSessionCost($data);

            PersonalSession::create([
                'session_id' => $session->id,
                'client_id'  => $data['client_id'],
            ]);

            // Фиксируем платёж за персональное занятие
            Payment::create([
                'client_id'           => $data['client_id'],
                'personal_session_id' => $session->id,
                'purpose'             => 'personal_session',
                'amount'              => $sessionCost,
                'paid_at'             => now(),
                'payment_method'      => $paymentMethod,
                'status'              => 'success',
                'transaction_id'      => 'TXN-' . strtoupper(uniqid()),
            ]);

            // Списываем с баланса клиента
            if ($paymentMethod === 'balance' && $sessionCost > 0) {
                $client->decrement('balance', $sessionCost);
            }
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

        // Тренер может редактировать только свои занятия
        if ($this->isTrainerOnly()) {
            $personId = $this->getAuthPersonId();
            if (!$personId || $session->trainer_id !== $personId) {
                return response()->json(['message' => 'Вы можете редактировать только свои занятия'], 403);
            }
        }

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

        // Обновить клиента если персональное
        if ($session->type === 'personal' && isset($data['client_id']) && $session->personalSession) {
            $session->personalSession->update(['client_id' => $data['client_id']]);
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

        // Тренер может отменять только свои занятия
        if ($this->isTrainerOnly()) {
            $personId = $this->getAuthPersonId();
            if (!$personId || $session->trainer_id !== $personId) {
                return response()->json(['message' => 'Вы можете отменять только свои занятия'], 403);
            }
        }

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
                'hourly_rate'    => $t->hourly_rate,
            ]),
        ]);
    }

    /**
     * Рассчитывает стоимость персональной сессии по ставке тренера и её длительности.
     */
    private function calcSessionCost(array $data): float
    {
        if (empty($data['trainer_id'])) {
            return 0.0;
        }
        $trainer = Trainer::find($data['trainer_id']);
        if (!$trainer || !$trainer->hourly_rate) {
            return 0.0;
        }
        $starts = Carbon::parse($data['starts_at']);
        $ends   = Carbon::parse($data['ends_at']);
        $hours  = $starts->diffInMinutes($ends) / 60; // $starts→$ends: positive when end > start
        return round((float) $trainer->hourly_rate * abs($hours), 2);
    }

    /**
     * Возвращает true, если текущий пользователь — тренер без прав admin/owner.
     */
    private function isTrainerOnly(): bool
    {
        $user = auth()->user();
        $roles = $user->roles->pluck('name')->toArray();
        return in_array('trainer', $roles)
            && !in_array('admin', $roles)
            && !in_array('owner', $roles);
    }

    /**
     * Возвращает persons.id текущего пользователя.
     */
    private function getAuthPersonId(): ?int
    {
        $user = auth()->user();
        $user->loadMissing('person');
        return $user->person?->id;
    }

    /**
     * Форматирование занятия для JSON.
     */
    private function formatSession(Session $session): array
    {
        $data = [
            'id'         => $session->id,
            'type'       => $session->type,
            'starts_at'  => $session->starts_at->toIso8601String(),
            'ends_at'    => $session->ends_at->toIso8601String(),
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
