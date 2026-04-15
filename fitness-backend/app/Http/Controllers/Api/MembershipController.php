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
            } elseif (!$promo->isValidForType($type->id)) {
                $promoMessage = 'Промокод не действует на выбранный тип абонемента';
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
                'purpose'        => $payment->purpose ?? 'membership',
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

        $payment = Payment::with(['membership.membershipType', 'membership.client.person.user', 'client'])->findOrFail($id);

        if ($payment->status !== 'pending') {
            return response()->json([
                'message' => 'Платёж уже обработан',
                'payment_status' => $payment->status,
            ], 409);
        }

        // ── Пополнение баланса ────────────────────────────────────────
        if (($payment->purpose ?? 'membership') === 'balance_topup') {
            if ($data['success']) {
                $payment->update(['status' => 'success', 'paid_at' => now()]);
                $client = $payment->client ?? Client::find($payment->client_id);
                if ($client) {
                    $client->increment('balance', $payment->amount);
                }
                return response()->json(['message' => 'Баланс пополнен', 'success' => true]);
            }
            $payment->update(['status' => 'cancelled']);
            return response()->json(['message' => 'Пополнение отменено', 'success' => false]);
        }

        // ── Оплата абонемента ─────────────────────────────────────────
        $membership = $payment->membership;
        if (!$membership) {
            return response()->json(['message' => 'Абонемент не найден'], 404);
        }

        $credentials = null;

        if ($data['success']) {
            // Успех: фиксируем платёж, отмечаем промокод
            $payment->update(['status' => 'success', 'paid_at' => now()]);

            if ($membership->is_renewal) {
                // Продление: ищем действующий или замороженный абонемент клиента
                $existing = Membership::where('client_id', $membership->client_id)
                    ->where('id', '!=', $membership->id)
                    ->whereIn('status', ['active', 'frozen'])
                    ->first();

                if ($existing) {
                    $type = $membership->membershipType;
                    $existing->update([
                        'end_date'         => $existing->end_date->addDays($type->duration_days),
                        'remaining_visits' => $existing->remaining_visits + $type->visit_limit,
                    ]);
                    $membership->update(['status' => 'cancelled']);
                } else {
                    // Нет действующего — активируем новый
                    $membership->update(['status' => 'active']);
                }
            } else {
                $membership->update(['status' => 'active']);
            }

            if ($payment->promo_code_id) {
                PromoCode::find($payment->promo_code_id)?->markUsed();
            }

            // credentials — только для не-разовых не-продлением абонементов
            $type = $membership->membershipType;
            $isTrial = $this->isTrialType($type);
            if (!$isTrial && !$membership->is_renewal) {
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
     * POST /api/v1/memberships/{id}/self-freeze
     * Клиент самостоятельно замораживает свой абонемент (не более 1 раза).
     * Срок действия автоматически продлевается на период заморозки.
     */
    public function selfFreeze(Request $request, int $id): JsonResponse
    {
        $client = auth()->user()->person?->client ?? null;
        if (!$client) {
            return response()->json(['message' => 'Клиент не найден'], 404);
        }

        $membership = Membership::findOrFail($id);

        if ((int) $membership->client_id !== (int) $client->person_id) {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        if ($membership->status !== 'active') {
            return response()->json(['message' => 'Можно заморозить только активный абонемент'], 409);
        }

        if ($membership->has_been_frozen) {
            return response()->json([
                'message' => 'Абонемент уже был заморожен. Заморозка возможна только 1 раз за срок действия абонемента',
            ], 409);
        }

        $days = (int) $request->input('days', 14);
        if (!in_array($days, [7, 14, 30])) {
            $days = 14;
        }

        $until = now()->addDays($days);
        $membership->update([
            'status'          => 'frozen',
            'frozen_until'    => $until,
            'has_been_frozen' => true,
            'end_date'        => $membership->end_date->addDays($days),
        ]);

        return response()->json([
            'message' => "Абонемент заморожен до {$until->format('d.m.Y')}. Срок действия продлён на {$days} дн.",
            'data'    => $this->formatMembership($membership->fresh(['client.person', 'membershipType'])),
        ]);
    }

    /**
     * POST /api/v1/memberships/{id}/self-unfreeze
     * Клиент самостоятельно размораживает свой абонемент досрочно.
     */
    public function selfUnfreeze(int $id): JsonResponse
    {
        $client = auth()->user()->person?->client ?? null;
        if (!$client) {
            return response()->json(['message' => 'Клиент не найден'], 404);
        }

        $membership = Membership::findOrFail($id);

        if ((int) $membership->client_id !== (int) $client->person_id) {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        if ($membership->status !== 'frozen') {
            return response()->json(['message' => 'Абонемент не заморожен'], 409);
        }

        // Сколько дней заморозки ещё не использовано
        $remainingFreezeDays = max(0, (int) now()->diffInDays($membership->frozen_until, false));

        $membership->update([
            'status'       => 'active',
            'frozen_until' => null,
            'end_date'     => $membership->end_date->subDays($remainingFreezeDays),
        ]);

        $msg = $remainingFreezeDays > 0
            ? "Абонемент разморожен досрочно. Дата окончания скорректирована на {$remainingFreezeDays} дн."
            : 'Абонемент разморожен';

        return response()->json([
            'message' => $msg,
            'data'    => $this->formatMembership($membership->fresh(['client.person', 'membershipType'])),
        ]);
    }

    /**
     * POST /api/v1/memberships/self-renew
     * Клиент самостоятельно продлевает/покупает абонемент онлайн.
     * Если есть активный абонемент — при успехе оплаты он будет продлён.
     */
    public function selfRenew(Request $request): JsonResponse
    {
        $data = $request->validate([
            'membership_type_id' => 'required|exists:membership_types,id',
            'payment_method'     => 'required|in:online_sbp,card_terminal',
            'promo_code'         => 'nullable|string|max:50',
        ]);

        $personId = auth()->user()->person?->id ?? 0;
        $client = Client::with('person.user')->where('person_id', $personId)->firstOrFail();

        // Блокируем создание дублирующего платежа
        $pendingRenewal = Membership::where('client_id', $client->person_id)
            ->where('is_renewal', true)
            ->where('status', 'pending_payment')
            ->first();
        if ($pendingRenewal) {
            return response()->json([
                'message' => 'У вас уже есть незавершённый платёж за продление абонемента',
            ], 409);
        }

        $type = MembershipType::findOrFail($data['membership_type_id']);

        // Промокод
        $promo      = null;
        $finalPrice = (float) $type->price;
        if (!empty($data['promo_code'])) {
            $promo = PromoCode::where('code', $data['promo_code'])->first();
            if (!$promo || !$promo->isValid()) {
                return response()->json(['message' => 'Промокод недействителен'], 422);
            }
            $finalPrice = $type->calculatePrice($promo);
        }

        // Создаём «абонемент-заглушку» для платежа
        $membership = Membership::create([
            'membership_number'  => Membership::generateNumber(),
            'client_id'          => $client->person_id,
            'membership_type_id' => $type->id,
            'administrator_id'   => null,
            'start_date'         => now()->toDateString(),
            'end_date'           => now()->addDays($type->duration_days)->toDateString(),
            'remaining_visits'   => $type->visit_limit,
            'status'             => 'pending_payment',
            'is_renewal'         => true,
        ]);

        $payment = Payment::create([
            'client_id'      => $client->person_id,
            'membership_id'  => $membership->id,
            'promo_code_id'  => $promo?->id,
            'amount'         => $finalPrice,
            'paid_at'        => now(),
            'payment_method' => $data['payment_method'],
            'status'         => 'pending',
            'transaction_id' => 'TXN-' . strtoupper(uniqid()),
        ]);

        $frontend = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

        return response()->json([
            'message'      => 'Перейдите на страницу оплаты',
            'payment'      => [
                'id'     => $payment->id,
                'amount' => $payment->amount,
                'method' => $payment->payment_method,
                'status' => $payment->status,
            ],
            'redirect_url' => "{$frontend}/payment/{$payment->id}",
        ], 201);
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
                'type_id'           => $m->membership_type_id,
                'visit_limit'       => $m->membershipType->visit_limit,
                'duration_days'     => $m->membershipType->duration_days,
                'status'            => $m->status,
                'start_date'        => $m->start_date->toDateString(),
                'end_date'          => $m->end_date->toDateString(),
                'remaining_visits'  => $m->remaining_visits,
                'frozen_until'      => $m->frozen_until?->toDateString(),
                'has_been_frozen'   => $m->has_been_frozen,
                'is_renewal'        => $m->is_renewal,
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
            'has_been_frozen'  => $m->has_been_frozen,
            'is_renewal'       => $m->is_renewal,
            'created_at'       => $m->created_at->toDateTimeString(),
        ];
    }
}
