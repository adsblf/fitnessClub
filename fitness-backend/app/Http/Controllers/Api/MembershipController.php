<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MembershipStoreRequest;
use App\Models\Client;
use App\Models\Membership;
use App\Models\MembershipType;
use App\Models\Payment;
use App\Models\PromoCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MembershipController extends Controller
{
    /**
     * GET /api/v1/membership-types
     * Список активных типов абонементов (публичный для авторизованных).
     */
    public function types(): JsonResponse
    {
        $types = MembershipType::where('is_active', true)->get();

        return response()->json([
            'data' => $types->map(fn ($t) => [
                'id'            => $t->id,
                'name'          => $t->name,
                'price'         => $t->price,
                'visit_limit'   => $t->visit_limit,
                'duration_days' => $t->duration_days,
                'description'   => $t->description,
            ]),
        ]);
    }

    /**
     * GET /api/v1/memberships
     * Все абонементы с фильтрацией.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Membership::with(['client.person', 'membershipType']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        $memberships = $query->orderByDesc('created_at')->paginate($request->query('per_page', 15));

        return response()->json([
            'data' => $memberships->map(fn ($m) => $this->formatMembership($m)),
            'meta' => [
                'current_page' => $memberships->currentPage(),
                'last_page'    => $memberships->lastPage(),
                'total'        => $memberships->total(),
            ],
        ]);
    }

    /**
     * POST /api/v1/memberships
     * Оформить абонемент клиенту.
     * Создаёт абонемент + оплату (имитация — всегда УСПЕШНО).
     */
    public function store(MembershipStoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        $client = Client::findOrFail($data['client_id']);
        $type = MembershipType::findOrFail($data['membership_type_id']);

        // Проверка: нет ли уже активного абонемента
        $existing = $client->memberships()->where('status', 'active')->first();
        if ($existing) {
            return response()->json([
                'message' => 'У клиента уже есть активный абонемент (№' . $existing->membership_number . ')',
            ], 409);
        }

        // Рассчитать цену с промокодом (если указан)
        $promo = null;
        $finalPrice = (float) $type->price;

        if (!empty($data['promo_code'])) {
            $promo = PromoCode::where('code', $data['promo_code'])->first();

            if (!$promo || !$promo->isValid()) {
                return response()->json([
                    'message' => 'Промокод недействителен',
                ], 422);
            }

            $finalPrice = $type->calculatePrice($promo);
            $promo->markUsed();
        }

        // Получить ID администратора (текущий пользователь)
        $adminId = auth()->user()->person?->administrator?->person_id;

        // Создать абонемент
        $membership = Membership::create([
            'membership_number'  => Membership::generateNumber(),
            'client_id'          => $client->person_id,
            'membership_type_id' => $type->id,
            'administrator_id'   => $adminId,
            'start_date'         => now()->toDateString(),
            'end_date'           => now()->addDays($type->duration_days)->toDateString(),
            'remaining_visits'   => $type->visit_limit,
            'status'             => 'active',
        ]);

        // Создать оплату (имитация — всегда успешно)
        Payment::create([
            'client_id'      => $client->person_id,
            'membership_id'  => $membership->id,
            'promo_code_id'  => $promo?->id,
            'amount'         => $finalPrice,
            'paid_at'        => now(),
            'payment_method' => $data['payment_method'] ?? 'cash',
            'status'         => 'success',
            'transaction_id' => 'TXN-' . strtoupper(uniqid()),
        ]);

        $membership->load(['client.person', 'membershipType']);

        return response()->json([
            'message' => 'Абонемент оформлен',
            'data'    => $this->formatMembership($membership),
        ], 201);
    }

    /**
     * POST /api/v1/memberships/{id}/freeze
     * Заморозить абонемент.
     */
    public function freeze(Request $request, int $id): JsonResponse
    {
        $membership = Membership::findOrFail($id);

        if ($membership->status !== 'active') {
            return response()->json([
                'message' => 'Можно заморозить только активный абонемент',
            ], 409);
        }

        $days = $request->input('days', 14);
        $until = now()->addDays($days);

        $membership->freeze($until);

        return response()->json([
            'message' => 'Абонемент заморожен до ' . $until->toDateString(),
            'data'    => $this->formatMembership($membership->fresh(['client.person', 'membershipType'])),
        ]);
    }

    /**
     * POST /api/v1/memberships/{id}/unfreeze
     * Разморозить абонемент.
     */
    public function unfreeze(int $id): JsonResponse
    {
        $membership = Membership::findOrFail($id);

        if ($membership->status !== 'frozen') {
            return response()->json([
                'message' => 'Абонемент не заморожен',
            ], 409);
        }

        $membership->unfreeze();

        return response()->json([
            'message' => 'Абонемент разморожен',
            'data'    => $this->formatMembership($membership->fresh(['client.person', 'membershipType'])),
        ]);
    }

    /**
     * GET /api/v1/clients/{clientId}/memberships
     * Абонементы конкретного клиента.
     */
    public function clientMemberships(int $clientId): JsonResponse
    {
        $memberships = Membership::with('membershipType')
            ->where('client_id', $clientId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $memberships->map(fn ($m) => [
                'id'               => $m->id,
                'membership_number' => $m->membership_number,
                'type'             => $m->membershipType->name,
                'status'           => $m->status,
                'start_date'       => $m->start_date->toDateString(),
                'end_date'         => $m->end_date->toDateString(),
                'remaining_visits' => $m->remaining_visits,
                'frozen_until'     => $m->frozen_until?->toDateString(),
            ]),
        ]);
    }

    private function formatMembership(Membership $m): array
    {
        return [
            'id'               => $m->id,
            'membership_number' => $m->membership_number,
            'client_id'        => $m->client_id,
            'client_name'      => $m->client->person->full_name ?? null,
            'type'             => [
                'id'   => $m->membershipType->id,
                'name' => $m->membershipType->name,
                'price' => $m->membershipType->price,
            ],
            'status'           => $m->status,
            'start_date'       => $m->start_date->toDateString(),
            'end_date'         => $m->end_date->toDateString(),
            'remaining_visits' => $m->remaining_visits,
            'frozen_until'     => $m->frozen_until?->toDateString(),
            'created_at'       => $m->created_at->toDateTimeString(),
        ];
    }
}
