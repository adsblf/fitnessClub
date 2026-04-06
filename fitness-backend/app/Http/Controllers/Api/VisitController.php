<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\VisitRequest;
use App\Models\Client;
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
}
