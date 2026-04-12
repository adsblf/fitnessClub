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
use Illuminate\Support\Str;

class ClientController extends Controller
{
    /**
     * GET /api/v1/clients
     */
    public function index(Request $request): JsonResponse
    {
        $query = Client::with(['person.user', 'memberships.membershipType']);

        if ($search = $request->query('search')) {
            $query->whereHas('person', function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q2) use ($search) {
                        $q2->where('email', 'like', "%{$search}%");
                    });
            });
        }

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
     */
    public function store(ClientRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Если логин не передан — сгенерируем уникальный логин
        $login = $data['login'] ?? ('client.' . Str::random(8));
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? 'password';

        $user = User::create([
            'login'    => $login,
            'email'    => $email,
            'password' => Hash::make($password),
        ]);

        $clientRole = Role::where('name', 'client')->first();
        $user->roles()->attach($clientRole);

        $person = Person::create([
            'user_id'                  => $user->id,
            'full_name'                => $data['full_name'],
            'phone'                    => $data['phone'] ?? null,
            'birth_date'               => $data['birth_date'] ?? null,
            'passport_series'          => $data['passport_series'] ?? null,
            'passport_number'          => $data['passport_number'] ?? null,
            'passport_issued_at'       => $data['passport_issued_at'] ?? null,
            'passport_issued_by'       => $data['passport_issued_by'] ?? null,
            'passport_department_code' => $data['passport_department_code'] ?? null,
            'registration_address'     => $data['registration_address'] ?? null,
        ]);

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

        $data['card'] = $client->card ? [
            'training_goal'     => $client->card->training_goal,
            'current_weight'    => $client->card->current_weight,
            'height'            => $client->card->height,
            'bmi'               => $client->card->getBmi(),
            'contraindications' => $client->card->contraindications,
            'trainer_notes'     => $client->card->trainer_notes,
        ] : null;

        $data['total_visits']    = $client->visits->count();
        $data['active_bookings'] = $client->bookings->where('status', '!=', 'cancelled')->count();

        return response()->json(['data' => $data]);
    }

    /**
     * PUT /api/v1/clients/{id}
     */
    public function update(ClientRequest $request, int $id): JsonResponse
    {
        $client = Client::with('person.user')->findOrFail($id);
        $data = $request->validated();

        // Используем array_key_exists, чтобы корректно обнулять поля (передавать null)
        $personFields = [
            'full_name',
            'phone',
            'birth_date',
            'passport_series',
            'passport_number',
            'passport_issued_at',
            'passport_issued_by',
            'passport_department_code',
            'registration_address',
        ];
        $personData = [];
        foreach ($personFields as $field) {
            if (array_key_exists($field, $data)) {
                $personData[$field] = $data[$field] === '' ? null : $data[$field];
            }
        }
        if (!empty($personData)) {
            $client->person->update($personData);
        }

        if (array_key_exists('email', $data)) {
            // Обновляем email через forceFill, чтобы избежать проблем с guarded/fillable
            $client->person->user->forceFill(['email' => $data['email']])->save();
        }

        if (array_key_exists('login', $data)) {
            // Обновляем логин через forceFill
            $client->person->user->forceFill(['login' => $data['login']])->save();
        }

        if (array_key_exists('status', $data)) {
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
     */
    public function destroy(int $id): JsonResponse
    {
        $client = Client::with('person.user')->findOrFail($id);
        $client->person->user->delete();

        return response()->json(['message' => 'Клиент удалён']);
    }

    /**
     * GET /api/v1/clients/search
     * Поиск клиентов для autocomplete по ФИО.
     * Query params: q (минимум 2 символа), limit (по умолчанию 10)
     */
    public function search(Request $request): JsonResponse
    {
        $query = $request->query('q', '');
        $limit = (int) $request->query('limit', 10);

        if (strlen($query) < 2) {
            return response()->json(['data' => []]);
        }

        $clients = Client::with(['person.user', 'memberships.membershipType'])
            ->whereHas('person', function ($q) use ($query) {
                $q->where('full_name', 'like', "%{$query}%");
            })
            ->where('status', 'active')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $clients->map(function ($client) {
                $activeMembership = $client->getActiveMembership();
                return [
                    'person_id' => $client->person_id,
                    'full_name' => $client->person->full_name,
                    'phone' => $client->person->phone,
                    'status' => $client->status,
                    'remaining_visits' => $client->getRemainingVisits(),
                    'active_membership' => $activeMembership ? [
                        'type' => $activeMembership->membershipType->name,
                        'remaining_visits' => $activeMembership->remaining_visits,
                    ] : null,
                ];
            })->toArray(),
        ]);
    }

    /**
     * Форматирование клиента для JSON-ответа.
     */
    private function formatClient(Client $client): array
    {
        $activeMembership = $client->getActiveMembership();
        $person = $client->person;

        return [
            'id'                => $client->person_id,
            'full_name'         => $person->full_name,
            'email'             => $person->user->email,
            'phone'             => $person->phone,
            'birth_date'        => $person->birth_date?->toDateString(),
            'registration_date' => $client->registration_date->toDateString(),
            'status'            => $client->status,
            'remaining_visits'  => $client->getRemainingVisits(),

            // Паспортные данные
            'passport_series'           => $person->passport_series,
            'passport_number'           => $person->passport_number,
            'passport_issued_at'        => $person->passport_issued_at?->toDateString(),
            'passport_issued_by'        => $person->passport_issued_by,
            'passport_department_code'  => $person->passport_department_code,
            'registration_address'      => $person->registration_address,
            'has_passport'              => $person->hasPassport(),

            'membership' => $activeMembership ? [
                'id'               => $activeMembership->id,
                'type'             => $activeMembership->membershipType->name,
                'status'           => $activeMembership->status,
                'end_date'         => $activeMembership->end_date->toDateString(),
                'remaining_visits' => $activeMembership->remaining_visits,
            ] : null,
        ];
    }
}
