<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Client;
use App\Models\Person;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * POST /api/v1/auth/register
     * Регистрация нового клиента.
     * Создаёт: User → Person → Client + назначает роль "client".
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        // если логин не передан — сгенерируем
        $login = $data['login'] ?? ('user.' . Str::random(8));

        // 1. Создаём пользователя
        $user = User::create([
            'email'    => $data['email'],
            'login'    => $login,
            'password' => Hash::make($data['password']),
        ]);

        // 2. Назначаем роль "client"
        $clientRole = Role::where('name', 'client')->first();
        $user->roles()->attach($clientRole);

        // 3. Создаём профиль (person)
        $person = Person::create([
            'user_id'    => $user->id,
            'full_name'  => $data['full_name'],
            'phone'      => $data['phone'] ?? null,
            'birth_date' => $data['birth_date'] ?? null,
        ]);

        // 4. Создаём клиента
        Client::create([
            'person_id'         => $person->id,
            'registration_date' => now()->toDateString(),
            'status'            => 'active',
        ]);

        // 5. Генерируем токен
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Регистрация успешна',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ], 201);
    }

    /**
     * POST /api/v1/auth/login
     * Логин по email + password → возвращает Bearer-токен.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Поддерживаем вход по логину или по email (для существующих демо-аккаунтов)
        $identity = $data['login'];
        $user = User::where('login', $identity)
                    ->orWhere('email', $identity)
                    ->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json([
                'message' => 'Неверный логин/email или пароль',
            ], 401);
        }

        // Удаляем старые токены (один токен на сессию)
        $user->tokens()->delete();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Вход выполнен',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ]);
    }

    /**
     * POST /api/v1/auth/logout
     * Удаляет текущий токен.
     */
    public function logout(): JsonResponse
    {
        auth()->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Выход выполнен',
        ]);
    }

    /**
     * GET /api/v1/auth/me
     * Возвращает данные текущего пользователя.
     */
    public function me(): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUser(auth()->user()),
        ]);
    }

    /**
     * Форматирование данных пользователя для ответа.
     */
    private function formatUser(User $user): array
    {
        $user->load(['roles', 'person']);

        $result = [
            'id'    => $user->id,
            'email' => $user->email,
            'login' => $user->login,
            'roles' => $user->roles->pluck('name'),
        ];

        if ($user->person) {
            $result['full_name']  = $user->person->full_name;
            $result['phone']      = $user->person->phone;
            $result['birth_date'] = $user->person->birth_date?->toDateString();
        }

        return $result;
    }
}
