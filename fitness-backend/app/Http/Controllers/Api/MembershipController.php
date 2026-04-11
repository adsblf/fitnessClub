<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MembershipStoreRequest;
use App\Models\Client;
use App\Models\Membership;
use App\Models\MembershipType;
use App\Models\Payment;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MembershipController extends Controller
{
    /**
     * Признак "разовая тренировка" — определяется по visit_limit = 1 И duration_days <= 1.
     */
    private function isTrialType(MembershipType $type): bool
    {
        return $type->visit_limit <= 1 && $type->duration_days <= 1;
    }

    /**
     * Способы оплаты, которые уводят на эмулятор эквайринга.
     */
    private function isAcquiringMethod(string $method): bool
    {
        return in_array($method, ['card_terminal', 'online_sbp'], true);
    }

    /**
     * GET /api/v1/membership-types
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
                'is_trial'      => $this->isTrialType($t),
            ]),
        ]);
    }

    /**
     * POST /api/v1/memberships/calculate-price
     * Предварительный расчёт цены с учётом промокода (без создания абонемента).
     *
     * Ответ:
     *  {
     *    original_price: number,
     *    final_price: number,
     *    discount: number,
     *    promo_valid: bool,
     *    promo_message: string|null
     *  }
     */
    public function calculatePrice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'membership_type_id' => 'required|exists:membership_types,id',
            'promo_code'         => 'nullable|string|max:50',
        ]);

        $type = MembershipType::findOrFail($data['membership_type_id']);
        $original = (float) $type->price;
        $final = $original;
        $promoValid = false;
        $promoMessage = null;

        if (!empty($data['promo_code'])) {
            $promo = PromoCode::where('code', $data['promo_code'])->first();
            if (!$promo) {
                $promoMessage = 'Промокод не найден';
            } elseif (!$promo->isValid()) {
                $promoMessage = 'Промокод недействителен или истёк';
            } else {
                $final = $type->calculatePrice($promo);
                $promoValid = true;
                $promoMessage = $promo->discount_type === 'percent'
                    ? "Скидка {$promo->discount_value}%"
                    : "Скидка " . number_format($promo->discount_value, 0, '.', ' ') . " ₽";
            }
        }

        return response()->json([
            'original_price' => round($original, 2),
            'final_price'    => round($final, 2),
            'discount'       => round($original - $final, 2),
            'promo_valid'    => $promoValid,
            'promo_message'  => $promoMessage,
        ]);
    }

    /**
     * GET /api/v1/memberships
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

        if ($search = $request->query('search')) {
            $query->whereHas('client.person', function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%");
            });
        }

        $memberships = $query->orderByDesc('created_at')
            ->paginate($request->query('per_page', 15));

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
     *
     * Для cash / bank_transfer: абонемент сразу активен, credentials выдаются сразу.
     * Для card_terminal / online_sbp: абонемент создаётся со статусом pending_payment,
     * платёж — pending, возвращается redirect_url на эмулятор эквайринга.
     * Активация и генерация credentials произойдут в методе paymentWebhook.
     */
    public function store(MembershipStoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        $client = Client::with('person.user')->findOrFail($data['client_id']);
        $type = MembershipType::findOrFail($data['membership_type_id']);

        // Паспорт — только разовую без паспорта
        $isTrial = $this->isTrialType($type);
        if (!$isTrial && !$client->person->hasPassport()) {
            return response()->json([
                'message' => 'Для оформления этого абонемента нужны паспортные данные клиента. '
                           . 'Доступна только разовая тренировка.',
            ], 422);
        }

        // Активный или ожидающий оплаты абонемент
        $existing = $client->memberships()
            ->whereIn('status', ['active', 'pending_payment'])
            ->first();
        if ($existing) {
            $msg = $existing->status === 'pending_payment'
                ? "У клиента уже есть абонемент в ожидании оплаты (№{$existing->membership_number})"
                : "У клиента уже есть активный абонемент (№{$existing->membership_number})";
            return response()->json(['message' => $msg], 409);
        }

        // Промокод
        $promo = null;
        $finalPrice = (float) $type->price;

        if (!empty($data['promo_code'])) {
            $promo = PromoCode::where('code', $data['promo_code'])->first();
            if (!$promo || !$promo->isValid()) {
                return response()->json(['message' => 'Промокод недействителен'], 422);
            }
            $finalPrice = $type->calculatePrice($promo);
        }

        $adminId = auth()->user()->person?->administrator?->person_id;
        $method = $data['payment_method'] ?? 'cash';
        $needsAcquiring = $this->isAcquiringMethod($method);

        // ── Создаём абонемент ──
        $membership = Membership::create([
            'membership_number'  => Membership::generateNumber(),
            'client_id'          => $client->person_id,
            'membership_type_id' => $type->id,
            'administrator_id'   => $adminId,
            'start_date'         => now()->toDateString(),
            'end_date'           => now()->addDays($type->duration_days)->toDateString(),
            'remaining_visits'   => $type->visit_limit,
            'status'             => $needsAcquiring ? 'pending_payment' : 'active',
        ]);

        // ── Создаём платёж ──
        $payment = Payment::create([
            'client_id'      => $client->person_id,
            'membership_id'  => $membership->id,
            'promo_code_id'  => $promo?->id,
            'amount'         => $finalPrice,
            'paid_at'        => now(),
            'payment_method' => $method,
            'status'         => $needsAcquiring ? 'pending' : 'success',
            'transaction_id' => 'TXN-' . strtoupper(uniqid()),
        ]);

        // Для cash / bank_transfer — промокод уже "использован",
        // для эквайринга — пометим как использованный только при успехе webhook.
        if (!$needsAcquiring && $promo) {
            $promo->markUsed();
        }

        // ── Credentials ──
        // Для cash/bank_transfer (не-разовый) — выдаём сразу.
        // Для эквайринга — только после webhook(success).
        $credentials = null;
        if (!$needsAcquiring && !$isTrial) {
            $credentials = $this->generateCredentialsFor($client);
        }

        $membership->load(['client.person', 'membershipType']);

        $response = [
            'message'     => $needsAcquiring
                ? 'Абонемент зарезервирован. Ожидание оплаты.'
                : 'Абонемент оформлен',
            'data'        => $this->formatMembership($membership),
            'credentials' => $credentials,
            'payment'     => [
                'id'     => $payment->id,
                'amount' => $payment->amount,
                'method' => $payment->payment_method,
                'status' => $payment->status,
            ],
        ];

        // Ссылка на эмулятор эквайринга (маршрут во фронтенде)
        if ($needsAcquiring) {
            $frontend = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
            $response['redirect_url'] = "{$frontend}/payment/{$payment->id}";
        }

        return response()->json($response, 201);
    }

    /**
     * GET /api/v1/payments/{id}/status
     * Публичный (для эмулятора и основной вкладки, чтобы опрашивать статус).
     */
    public function paymentStatus(int $id): JsonResponse
    {
        $payment = Payment::with(['membership.membershipType', 'client.person'])->findOrFail($id);

        return response()->json([
            'data' => [
                'id'             => $payment->id,
                'amount'         => $payment->amount,
                'method'         => $payment->payment_method,
                'status'         => $payment->status,
                'transaction_id' => $payment->transaction_id,
                'membership_id'  => $payment->membership_id,
                'client_name'    => $payment->client?->person?->full_name,
                'membership_type' => $payment->membership?->membershipType?->name,
                'membership_status' => $payment->membership?->status,
            ],
        ]);
    }

    /**
     * POST /api/v1/payments/{id}/webhook
     * Body: { success: true|false }
     *
     * Эмулирует ответ платёжного шлюза. Доступен без auth (как обычный webhook),
     * но требует параметр success в теле.
     *
     * При success=true — активирует абонемент и возвращает credentials (один раз).
     * При success=false — отменяет абонемент и помечает платёж как cancelled.
     */
    public function paymentWebhook(int $id, Request $request): JsonResponse
    {
        $data = $request->validate([
            'success' => 'required|boolean',
        ]);

        $payment = Payment::with(['membership.client.person.user'])->findOrFail($id);

        if ($payment->status !== 'pending') {
            return response()->json([
                'message' => 'Платёж уже обработан',
                'payment_status' => $payment->status,
            ], 409);
        }

        $membership = $payment->membership;
        if (!$membership) {
            return response()->json(['message' => 'Абонемент не найден'], 404);
        }

        $credentials = null;

        if ($data['success']) {
            // Успех: активируем абонемент, фиксируем платёж, отмечаем промокод, выдаём credentials
            $payment->update(['status' => 'success', 'paid_at' => now()]);
            $membership->update(['status' => 'active']);

            if ($payment->promo_code_id) {
                PromoCode::find($payment->promo_code_id)?->markUsed();
            }

            // credentials — только для не-разовых абонементов
            $type = $membership->membershipType;
            $isTrial = $this->isTrialType($type);
            if (!$isTrial) {
                $client = $membership->client;
                $credentials = $this->generateCredentialsFor($client);
            }

            return response()->json([
                'message'     => 'Оплата прошла успешно',
                'success'     => true,
                'credentials' => $credentials,
            ]);
        }

        // Отмена
        $payment->update(['status' => 'cancelled']);
        $membership->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Оплата отменена',
            'success' => false,
        ]);
    }

    /**
     * GET /api/v1/clients/{id}/credentials
     * Возвращает сохранённый plain_password для клиента.
     * Только для админа (проверка на уровне роута).
     */
    public function clientCredentials(int $clientId): JsonResponse
    {
        $client = Client::with('person.user')->findOrFail($clientId);
        $person = $client->person;

        if (empty($person->plain_password)) {
            return response()->json([
                'data' => null,
                'message' => 'Учётные данные не генерировались для этого клиента',
            ]);
        }

        return response()->json([
            'data' => [
                'login'    => $person->user->login,
                'password' => $person->plain_password,
            ],
        ]);
    }

    /**
     * Сгенерировать новый login (email) и пароль, сохранить в user + people.plain_password.
     */
    private function generateCredentialsFor(Client $client): array
    {
        do {
            $login = 'client.' . strtolower(Str::random(8));
        } while (User::where('login', $login)->exists());

        $password = Str::random(10);

        $user = $client->person->user;
        $user->update([
            'login'    => $login,
             'password' => Hash::make($password),
         ]);

        // Сохраняем открытый пароль в person, чтобы админ мог его напомнить клиенту
        $client->person->update(['plain_password' => $password]);

        // Сбрасываем старые токены
        $user->tokens()->delete();

        return [
            'login'    => $login,
            'password' => $password,
        ];
    }

    /**
     * POST /api/v1/memberships/{id}/freeze
     */
    public function freeze(Request $request, int $id): JsonResponse
    {
        $membership = Membership::findOrFail($id);

        if ($membership->status !== 'active') {
            return response()->json(['message' => 'Можно заморозить только активный абонемент'], 409);
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
     */
    public function unfreeze(int $id): JsonResponse
    {
        $membership = Membership::findOrFail($id);

        if ($membership->status !== 'frozen') {
            return response()->json(['message' => 'Абонемент не заморожен'], 409);
        }

        $membership->unfreeze();

        return response()->json([
            'message' => 'Абонемент разморожен',
            'data'    => $this->formatMembership($membership->fresh(['client.person', 'membershipType'])),
        ]);
    }

    /**
     * POST /api/v1/memberships/{id}/cancel
     */
    public function cancel(int $id): JsonResponse
    {
        $membership = Membership::findOrFail($id);

        if ($membership->status === 'cancelled') {
            return response()->json(['message' => 'Абонемент уже аннулирован'], 409);
        }

        $membership->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Абонемент аннулирован',
            'data'    => $this->formatMembership($membership->fresh(['client.person', 'membershipType'])),
        ]);
    }

    /**
     * GET /api/v1/clients/{clientId}/memberships
     */
    public function clientMemberships(int $clientId): JsonResponse
    {
        $memberships = Membership::with('membershipType')
            ->where('client_id', $clientId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $memberships->map(fn ($m) => [
                'id'                => $m->id,
                'membership_number' => $m->membership_number,
                'type'              => $m->membershipType->name,
                'status'            => $m->status,
                'start_date'        => $m->start_date->toDateString(),
                'end_date'          => $m->end_date->toDateString(),
                'remaining_visits'  => $m->remaining_visits,
                'frozen_until'      => $m->frozen_until?->toDateString(),
            ]),
        ]);
    }

    private function formatMembership(Membership $m): array
    {
        return [
            'id'                => $m->id,
            'membership_number' => $m->membership_number,
            'client_id'         => $m->client_id,
            'client_name'       => $m->client->person->full_name ?? null,
            'type' => [
                'id'    => $m->membershipType->id,
                'name'  => $m->membershipType->name,
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
