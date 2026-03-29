<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClientRequest;
use App\Models\Client;
use App\Models\Person;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ClientController extends Controller
{
    /**
     * GET /api/v1/clients
     * Список всех клиентов с пагинацией и поиском.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Client::with(['person.user', 'memberships.membershipType']);

        // Поиск по ФИО, телефону или email
        if ($search = $request->query('search')) {
            $query->whereHas('person', function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($q2) use ($search) {
                      $q2->where('email', 'like', "%{$search}%");
                  });
            });
        }

        // Фильтр по статусу
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = $request->query('per_page', 15);
        $clients = $query->paginate($perPage);

        return response()->json([
            'data' => $clients->map(fn ($client) => $this->formatClient($client)),
            'meta' => [
                'current_page' => $clients->currentPage(),
                'last_page'    => $clients->lastPage(),
                'per_page'     => $clients->perPage(),
                'total'        => $clients->total(),
            ],
        ]);
    }

    /**
     * POST /api/v1/clients
     * Создать нового клиента (администратор создаёт вручную).
     */
    public function store(ClientRequest $request): JsonResponse
    {
        $data = $request->validated();

        // 1. Создаём пользователя
        $user = User::create([
            'email'    => $data['email'],
            'password' => Hash::make($data['password'] ?? 'password'),
        ]);

        // 2. Назначаем роль
        $clientRole = Role::where('name', 'client')->first();
        $user->roles()->attach($clientRole);

        // 3. Профиль
        $person = Person::create([
            'user_id'    => $user->id,
            'full_name'  => $data['full_name'],
            'phone'      => $data['phone'] ?? null,
            'birth_date' => $data['birth_date'] ?? null,
        ]);

        // 4. Клиент
        $client = Client::create([
            'person_id'         => $person->id,
            'registration_date' => now()->toDateString(),
            'status'            => 'active',
        ]);

        $client->load(['person.user', 'memberships.membershipType']);

        return response()->json([
            'message' => 'Клиент создан',
            'data'    => $this->formatClient($client),
        ], 201);
    }

    /**
     * GET /api/v1/clients/{id}
     * Получить профиль клиента с абонементами и статистикой.
     */
    public function show(int $id): JsonResponse
    {
        $client = Client::with([
            'person.user',
            'card',
            'memberships.membershipType',
            'visits',
            'bookings.session',
        ])->findOrFail($id);

        $data = $this->formatClient($client);

        // Добавляем расширенные данные
        $data['card'] = $client->card ? [
            'training_goal'    => $client->card->training_goal,
            'current_weight'   => $client->card->current_weight,
            'height'           => $client->card->height,
            'bmi'              => $client->card->getBmi(),
            'contraindications' => $client->card->contraindications,
            'trainer_notes'    => $client->card->trainer_notes,
        ] : null;

        $data['total_visits'] = $client->visits->count();

        $data['active_bookings'] = $client->bookings
            ->where('status', '!=', 'cancelled')
            ->count();

        return response()->json(['data' => $data]);
    }

    /**
     * PUT /api/v1/clients/{id}
     * Обновить данные клиента.
     */
    public function update(ClientRequest $request, int $id): JsonResponse
    {
        $client = Client::with('person.user')->findOrFail($id);
        $data = $request->validated();

        // Обновляем person
        $personData = array_filter([
            'full_name'  => $data['full_name'] ?? null,
            'phone'      => $data['phone'] ?? null,
            'birth_date' => $data['birth_date'] ?? null,
        ]);

        if (!empty($personData)) {
            $client->person->update($personData);
        }

        // Обновляем email если передан
        if (isset($data['email'])) {
            $client->person->user->update(['email' => $data['email']]);
        }

        // Обновляем статус клиента если передан
        if (isset($data['status'])) {
            $client->update(['status' => $data['status']]);
        }

        $client->load(['person.user', 'memberships.membershipType']);

        return response()->json([
            'message' => 'Клиент обновлён',
            'data'    => $this->formatClient($client),
        ]);
    }

    /**
     * DELETE /api/v1/clients/{id}
     * Удалить клиента (каскадно удалит person и user).
     */
    public function destroy(int $id): JsonResponse
    {
        $client = Client::with('person.user')->findOrFail($id);

        // Удаляем user — каскадно удалит person → client
        $client->person->user->delete();

        return response()->json([
            'message' => 'Клиент удалён',
        ]);
    }

    /**
     * Форматирование клиента для JSON-ответа.
     */
    private function formatClient(Client $client): array
    {
        $activeMembership = $client->getActiveMembership();

        return [
            'id'                => $client->person_id,
            'full_name'         => $client->person->full_name,
            'email'             => $client->person->user->email,
            'phone'             => $client->person->phone,
            'birth_date'        => $client->person->birth_date?->toDateString(),
            'registration_date' => $client->registration_date->toDateString(),
            'status'            => $client->status,
            'remaining_visits'  => $client->getRemainingVisits(),
            'membership'        => $activeMembership ? [
                'id'               => $activeMembership->id,
                'type'             => $activeMembership->membershipType->name,
                'status'           => $activeMembership->status,
                'end_date'         => $activeMembership->end_date->toDateString(),
                'remaining_visits' => $activeMembership->remaining_visits,
            ] : null,
        ];
    }
}
