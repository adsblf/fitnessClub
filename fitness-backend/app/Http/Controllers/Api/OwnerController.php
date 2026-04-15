<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Administrator;
use App\Models\MembershipType;
use App\Models\Person;
use App\Models\PromoCode;
use App\Models\Role;
use App\Models\Trainer;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * OwnerController — управление персоналом, тарифными планами и промокодами.
 * Доступен только для роли "owner".
 */
class OwnerController extends Controller
{
    // ══════════════════════════════════════════════════════════════════
    //  ПЕРСОНАЛ
    // ══════════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/owner/staff
     */
    public function listStaff(): JsonResponse
    {
        $adminRole   = Role::where('name', 'admin')->first();
        $trainerRole = Role::where('name', 'trainer')->first();

        $users = User::with(['roles', 'person.administrator', 'person.trainer'])
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'trainer']))
            ->get();

        return response()->json([
            'data' => $users->map(fn ($u) => $this->formatStaff($u)),
        ]);
    }

    /**
     * POST /api/v1/owner/staff
     */
    public function storeStaff(Request $request): JsonResponse
    {
        $data = $request->validate([
            'role'           => ['required', Rule::in(['admin', 'trainer'])],
            'full_name'      => 'required|string|max:150',
            'email'          => 'nullable|email|unique:users,email|max:150',
            'phone'          => 'nullable|string|max:30',
            'password'       => 'nullable|string|min:6|max:100',
            // admin
            'position'       => 'nullable|string|max:100',
            // trainer
            'specialization' => 'nullable|string|max:150',
            'description'    => 'nullable|string|max:1000',
            'hourly_rate'    => 'nullable|numeric|min:0|max:99999.99',
        ]);

        $password = $data['password'] ?? Str::random(10);
        $login    = ($data['role'] === 'admin' ? 'admin.' : 'trainer.') . Str::random(8);

        DB::transaction(function () use ($data, $password, $login, &$user) {
            $user = User::create([
                'login'    => $login,
                'email'    => $data['email'] ?? null,
                'password' => Hash::make($password),
            ]);

            $role = Role::where('name', $data['role'])->first();
            $user->roles()->attach($role);

            $person = Person::create([
                'user_id'        => $user->id,
                'full_name'      => $data['full_name'],
                'phone'          => $data['phone'] ?? null,
                'plain_password' => $password,
            ]);

            if ($data['role'] === 'admin') {
                Administrator::create([
                    'person_id' => $person->id,
                    'position'  => $data['position'] ?? null,
                ]);
            } else {
                Trainer::create([
                    'person_id'      => $person->id,
                    'specialization' => $data['specialization'] ?? null,
                    'contact_phone'  => $data['phone'] ?? null,
                    'description'    => $data['description'] ?? null,
                    'hourly_rate'    => $data['hourly_rate'] ?? null,
                ]);
            }
        });

        $user->load(['roles', 'person.administrator', 'person.trainer']);

        return response()->json([
            'message' => 'Сотрудник создан',
            'data'    => $this->formatStaff($user),
        ], 201);
    }

    /**
     * PUT /api/v1/owner/staff/{id}
     */
    public function updateStaff(Request $request, int $id): JsonResponse
    {
        $user = User::with(['roles', 'person.administrator', 'person.trainer'])
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'trainer']))
            ->findOrFail($id);

        $data = $request->validate([
            'full_name'      => 'sometimes|string|max:150',
            'email'          => ['sometimes', 'nullable', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'phone'          => 'sometimes|nullable|string|max:30',
            'password'       => 'sometimes|nullable|string|min:6|max:100',
            'position'       => 'sometimes|nullable|string|max:100',
            'specialization' => 'sometimes|nullable|string|max:150',
            'description'    => 'sometimes|nullable|string|max:1000',
            'hourly_rate'    => 'sometimes|nullable|numeric|min:0|max:99999.99',
        ]);

        DB::transaction(function () use ($user, $data) {
            if (isset($data['email']))    $user->update(['email' => $data['email']]);
            if (!empty($data['password'])) {
                $user->update(['password' => Hash::make($data['password'])]);
                if ($user->person) $user->person->update(['plain_password' => $data['password']]);
            }

            if ($user->person) {
                $personUpdate = [];
                if (isset($data['full_name'])) $personUpdate['full_name'] = $data['full_name'];
                if (isset($data['phone']))     $personUpdate['phone']     = $data['phone'];
                if ($personUpdate) $user->person->update($personUpdate);

                if ($user->person->administrator && isset($data['position'])) {
                    $user->person->administrator->update(['position' => $data['position']]);
                }
                if ($user->person->trainer) {
                    $trainerUpdate = [];
                    if (isset($data['specialization'])) $trainerUpdate['specialization'] = $data['specialization'];
                    if (isset($data['description']))    $trainerUpdate['description']     = $data['description'];
                    if (isset($data['phone']))           $trainerUpdate['contact_phone']   = $data['phone'];
                    if (array_key_exists('hourly_rate', $data)) $trainerUpdate['hourly_rate'] = $data['hourly_rate'];
                    if ($trainerUpdate) $user->person->trainer->update($trainerUpdate);
                }
            }
        });

        $user->load(['roles', 'person.administrator', 'person.trainer']);

        return response()->json([
            'message' => 'Данные сотрудника обновлены',
            'data'    => $this->formatStaff($user),
        ]);
    }

    /**
     * DELETE /api/v1/owner/staff/{id}
     */
    public function destroyStaff(int $id): JsonResponse
    {
        $user = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'trainer']))
            ->findOrFail($id);

        // Нельзя удалить самого себя
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Нельзя удалить собственную учётную запись'], 403);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Сотрудник удалён']);
    }

    private function formatStaff(User $u): array
    {
        $role = $u->roles->first();

        $result = [
            'id'        => $u->id,
            'role'      => $role?->name,
            'email'     => $u->email,
            'login'     => $u->login,
            'full_name' => $u->person?->full_name,
            'phone'     => $u->person?->phone,
        ];

        if ($u->person?->administrator) {
            $result['position'] = $u->person->administrator->position;
        }
        if ($u->person?->trainer) {
            $result['specialization'] = $u->person->trainer->specialization;
            $result['description']    = $u->person->trainer->description;
            $result['hourly_rate']    = $u->person->trainer->hourly_rate;
        }

        return $result;
    }

    // ══════════════════════════════════════════════════════════════════
    //  ТАРИФНЫЕ ПЛАНЫ
    // ══════════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/owner/membership-types  (все, включая неактивные)
     */
    public function listMembershipTypes(): JsonResponse
    {
        $types = MembershipType::orderBy('price')->get();

        return response()->json([
            'data' => $types->map(fn ($t) => $this->formatType($t)),
        ]);
    }

    /**
     * POST /api/v1/owner/membership-types
     */
    public function storeMembershipType(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'price'         => 'required|numeric|min:0',
            'visit_limit'   => 'nullable|integer|min:1',
            'duration_days' => 'required|integer|min:1',
            'description'   => 'nullable|string|max:1000',
            'is_active'     => 'boolean',
        ]);

        // Пустой лимит = безлимитный абонемент (999)
        $data['visit_limit'] = $data['visit_limit'] ?? 999;

        $type = MembershipType::create($data);

        return response()->json([
            'message' => 'Тарифный план создан',
            'data'    => $this->formatType($type),
        ], 201);
    }

    /**
     * PUT /api/v1/owner/membership-types/{id}
     */
    public function updateMembershipType(Request $request, int $id): JsonResponse
    {
        $type = MembershipType::findOrFail($id);

        $data = $request->validate([
            'name'          => 'sometimes|string|max:100',
            'price'         => 'sometimes|numeric|min:0',
            'visit_limit'   => 'sometimes|nullable|integer|min:1',
            'duration_days' => 'sometimes|integer|min:1',
            'description'   => 'sometimes|nullable|string|max:1000',
            'is_active'     => 'sometimes|boolean',
        ]);

        // Явно переданный null или пустое значение = безлимитный (999)
        if (array_key_exists('visit_limit', $data) && $data['visit_limit'] === null) {
            $data['visit_limit'] = 999;
        }

        $type->update($data);

        return response()->json([
            'message' => 'Тарифный план обновлён',
            'data'    => $this->formatType($type->fresh()),
        ]);
    }

    /**
     * DELETE /api/v1/owner/membership-types/{id}
     */
    public function destroyMembershipType(int $id): JsonResponse
    {
        $type = MembershipType::findOrFail($id);

        // Если есть активные абонементы — деактивируем, не удаляем
        if ($type->memberships()->whereIn('status', ['active', 'frozen'])->exists()) {
            $type->update(['is_active' => false]);
            return response()->json(['message' => 'Тарифный план деактивирован (есть активные абонементы)']);
        }

        $type->delete();
        return response()->json(['message' => 'Тарифный план удалён']);
    }

    private function formatType(MembershipType $t): array
    {
        return [
            'id'            => $t->id,
            'name'          => $t->name,
            'price'         => (float) $t->price,
            'visit_limit'   => $t->visit_limit,
            'duration_days' => $t->duration_days,
            'description'   => $t->description,
            'is_active'     => $t->is_active,
        ];
    }

    // ══════════════════════════════════════════════════════════════════
    //  ПРОМОКОДЫ
    // ══════════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/owner/promo-codes
     */
    public function listPromoCodes(): JsonResponse
    {
        $promos = PromoCode::with('membershipTypes')->orderByDesc('id')->get();

        return response()->json([
            'data' => $promos->map(fn ($p) => $this->formatPromo($p)),
        ]);
    }

    /**
     * POST /api/v1/owner/promo-codes
     */
    public function storePromoCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'               => 'required|string|max:50|unique:promo_codes,code',
            'discount_type'      => ['required', Rule::in(['percent', 'fixed'])],
            'discount_value'     => 'required|numeric|min:0.01',
            'starts_at'          => 'required|date',
            'ends_at'            => 'required|date|after_or_equal:starts_at',
            'max_uses'           => 'required|integer|min:1',
            'is_active'          => 'boolean',
            'membership_type_ids'=> 'nullable|array',
            'membership_type_ids.*' => 'integer|exists:membership_types,id',
        ]);

        $typeIds = $data['membership_type_ids'] ?? [];
        unset($data['membership_type_ids']);

        $data['code']      = strtoupper($data['code']);
        $data['used_count']= 0;

        $promo = PromoCode::create($data);

        if (!empty($typeIds)) {
            $promo->membershipTypes()->sync($typeIds);
        }

        return response()->json([
            'message' => 'Промокод создан',
            'data'    => $this->formatPromo($promo->load('membershipTypes')),
        ], 201);
    }

    /**
     * PUT /api/v1/owner/promo-codes/{id}
     */
    public function updatePromoCode(Request $request, int $id): JsonResponse
    {
        $promo = PromoCode::with('membershipTypes')->findOrFail($id);

        $data = $request->validate([
            'code'           => ['sometimes', 'string', 'max:50', Rule::unique('promo_codes', 'code')->ignore($promo->id)],
            'discount_type'  => ['sometimes', Rule::in(['percent', 'fixed'])],
            'discount_value' => 'sometimes|numeric|min:0.01',
            'starts_at'      => 'sometimes|date',
            'ends_at'        => 'sometimes|date',
            'max_uses'       => 'sometimes|integer|min:1',
            'is_active'      => 'sometimes|boolean',
            'membership_type_ids' => 'nullable|array',
            'membership_type_ids.*' => 'integer|exists:membership_types,id',
        ]);

        $typeIds = array_key_exists('membership_type_ids', $data) ? ($data['membership_type_ids'] ?? []) : null;
        unset($data['membership_type_ids']);

        if (isset($data['code'])) $data['code'] = strtoupper($data['code']);
        $promo->update($data);

        if ($typeIds !== null) {
            $promo->membershipTypes()->sync($typeIds);
        }

        return response()->json([
            'message' => 'Промокод обновлён',
            'data'    => $this->formatPromo($promo->fresh('membershipTypes')),
        ]);
    }

    /**
     * DELETE /api/v1/owner/promo-codes/{id}
     */
    public function destroyPromoCode(int $id): JsonResponse
    {
        $promo = PromoCode::findOrFail($id);
        $promo->membershipTypes()->detach();
        $promo->delete();

        return response()->json(['message' => 'Промокод удалён']);
    }

    private function formatPromo(PromoCode $p): array
    {
        return [
            'id'                  => $p->id,
            'code'                => $p->code,
            'discount_type'       => $p->discount_type,
            'discount_value'      => (float) $p->discount_value,
            'starts_at'           => $p->starts_at?->toDateString(),
            'ends_at'             => $p->ends_at?->toDateString(),
            'max_uses'            => $p->max_uses,
            'used_count'          => $p->used_count,
            'is_active'           => $p->is_active,
            'is_valid_now'        => $p->isValid(),
            'membership_type_ids' => $p->membershipTypes->pluck('id')->all(),
            'membership_type_names'=> $p->membershipTypes->pluck('name')->all(),
        ];
    }
}
