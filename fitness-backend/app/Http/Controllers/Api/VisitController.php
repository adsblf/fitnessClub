<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\VisitRequest;
use App\Models\Client;
use App\Models\Session;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VisitController extends Controller
{
    /**
     * POST /api/v1/visits
     * Зарегистрировать посещение клиента.
     *
     * Сценарий по диаграмме последовательности:
     * 1. Найти клиента и его активный абонемент
     * 2. Проверить остаток посещений
     * 3. Списать 1 посещение с абонемента
     * 4. Создать запись Visit
     */
    public function store(VisitRequest $request): JsonResponse
    {
        $data = $request->validated();

        $client = Client::findOrFail($data['client_id']);

        // Найти активный абонемент
        $membership = $client->getActiveMembership();

        if (!$membership) {
            return response()->json([
                'message' => 'У клиента нет активного абонемента',
            ], 409);
        }

        // Если указана сессия, проверить, можно ли её редактировать
        if ($data['session_id'] ?? false) {
            $session = Session::findOrFail($data['session_id']);
            if (!$session->isEditable()) {
                return response()->json([
                    'message' => 'Редактировать посещения можно только во время или после начала тренировки',
                ], 403);
            }
        }

        // Списать посещение
        if (!$membership->deductVisit()) {
            return response()->json([
                'message' => 'На абонементе не осталось посещений (остаток: 0)',
            ], 409);
        }

        // Определить, кто регистрирует (admin или trainer)
        $adminId = auth()->user()->person?->administrator?->person_id
                ?? auth()->user()->person?->id;

        // Создать посещение
        $visit = Visit::create([
            'client_id'        => $client->person_id,
            'session_id'       => $data['session_id'] ?? null,
            'administrator_id' => $adminId,
            'membership_id'    => $membership->id,
            'visited_at'       => $data['visited_at'] ?? now(),
            'status'           => $data['status'] ?? 'visited',
            'notes'            => $data['notes'] ?? null,
            'is_manual_entry'  => true,  // явное добавление администратором/тренером
        ]);

        $visit->load(['client.person', 'session', 'membership']);

        return response()->json([
            'message' => 'Посещение зарегистрировано. Остаток: ' . $membership->fresh()->remaining_visits,
            'data'    => $this->formatVisit($visit),
        ], 201);
    }

    /**
     * GET /api/v1/visits
     * Список посещений с фильтрацией.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Visit::with(['client.person', 'session.groupSession'])
            ->orderByDesc('visited_at');

        // Фильтр по дате
        if ($date = $request->query('date')) {
            $query->whereDate('visited_at', $date);
        }

        // Фильтр по клиенту
        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        $perPage = $request->query('per_page', 20);
        $visits = $query->paginate($perPage);

        return response()->json([
            'data' => $visits->map(fn ($v) => $this->formatVisit($v)),
            'meta' => [
                'current_page' => $visits->currentPage(),
                'last_page'    => $visits->lastPage(),
                'total'        => $visits->total(),
            ],
        ]);
    }

    /**
     * GET /api/v1/clients/{clientId}/visits
     * Посещения конкретного клиента.
     */
    public function clientVisits(int $clientId): JsonResponse
    {
        $visits = Visit::with(['session.groupSession', 'membership.membershipType'])
            ->where('client_id', $clientId)
            ->orderByDesc('visited_at')
            ->get();

        return response()->json([
            'data' => $visits->map(fn ($v) => $this->formatVisit($v)),
        ]);
    }

    private function formatVisit(Visit $v): array
    {
        return [
            'id'             => $v->id,
            'client_id'      => $v->client_id,
            'client_name'    => $v->client->person->full_name ?? null,
            'session_id'     => $v->session_id,
            'session_name'   => $v->session?->groupSession?->name ?? ($v->session ? 'Персональное' : 'Свободное'),
            'membership_id'  => $v->membership_id,
            'visited_at'     => $v->visited_at->toDateTimeString(),
            'status'         => $v->status,
            'notes'          => $v->notes,
        ];
    }

    /**
     * GET /api/v1/visits/sessions-with-visits
     * Получить сессии с информацией о посещениях, отсортированные по времени.
     */
    public function sessionsWithVisits(Request $request): JsonResponse
    {
        $query = Session::with([
            'hall',
            'trainer.person',
            'groupSession',
            'bookings' => function ($q) {
                $q->where('status', 'confirmed')->with(['client.person']);
            },
            'visits' => function ($q) {
                $q->with(['client.person']);
            },
        ])->orderBy('starts_at', 'asc');

        // Фильтр по дате (от)
        if ($fromDate = $request->query('from_date')) {
            $query->whereDate('starts_at', '>=', $fromDate);
        }

        // Фильтр по дате (до)
        if ($toDate = $request->query('to_date')) {
            $query->whereDate('starts_at', '<=', $toDate);
        }

        // Фильтр по тренеру
        if ($trainerId = $request->query('trainer_id')) {
            $query->where('trainer_id', $trainerId);
        }

        $perPage = $request->query('per_page', 20);
        $sessions = $query->paginate($perPage);

        return response()->json([
            'data' => $sessions->map(fn ($session) => $this->formatSessionWithVisits($session)),
            'meta' => [
                'current_page' => $sessions->currentPage(),
                'last_page'    => $sessions->lastPage(),
                'total'        => $sessions->total(),
            ],
        ]);
    }

    private function formatSessionWithVisits(Session $session): array
    {
        return [
            'id' => $session->id,
            'hall_name' => $session->hall->name ?? 'Зал',
            'trainer_name' => $session->trainer?->person->full_name ?? 'Без тренера',
            'session_name' => $session->groupSession?->name ?? 'Персональное занятие',
            'starts_at' => $session->starts_at->toDateTimeString(),
            'ends_at' => $session->ends_at->toDateTimeString(),
            'type' => $session->type,
            'is_editable' => $session->isEditable(),
            'max_participants' => $session->groupSession?->max_participants,
            'participants' => $session->getParticipantsInfo(),
        ];
    }
}
