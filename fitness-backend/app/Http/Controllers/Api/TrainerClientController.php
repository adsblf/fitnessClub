<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientMeasurement;
use App\Models\Session;
use App\Models\TrainerClientCard;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainerClientController extends Controller
{
    /**
     * Вернуть person_id тренера текущего пользователя.
     */
    private function trainerPersonId(): int
    {
        return auth()->user()->person->id;
    }

    // ─────────────────────────────────────────────────────
    // Список своих клиентов
    // GET /api/v1/trainer/clients
    // ─────────────────────────────────────────────────────
    public function index(): JsonResponse
    {
        $trainerId = $this->trainerPersonId();

        // Все клиенты, закреплённые за этим тренером
        $clients = Client::with(['person'])
            ->whereHas('trainers', function ($q) use ($trainerId) {
                $q->where('trainer_id', $trainerId);
            })
            ->get();

        $data = $clients->map(fn ($c) => $this->formatClientRow($c, $trainerId));

        return response()->json(['data' => $data]);
    }

    // ─────────────────────────────────────────────────────
    // Закрепить клиента
    // POST /api/v1/trainer/clients  { client_id }
    // ─────────────────────────────────────────────────────
    public function attach(Request $request): JsonResponse
    {
        $request->validate([
            'client_id' => 'required|exists:clients,person_id',
        ]);

        $trainerId = $this->trainerPersonId();
        $clientId  = $request->integer('client_id');

        // Нет смысла дублировать
        \DB::table('trainer_clients')->insertOrIgnore([
            'trainer_id'  => $trainerId,
            'client_id'   => $clientId,
            'attached_at' => now(),
        ]);

        return response()->json(['message' => 'Клиент добавлен'], 201);
    }

    // ─────────────────────────────────────────────────────
    // Открепить клиента
    // DELETE /api/v1/trainer/clients/{clientId}
    // ─────────────────────────────────────────────────────
    public function detach(int $clientId): JsonResponse
    {
        $trainerId = $this->trainerPersonId();

        \DB::table('trainer_clients')
            ->where('trainer_id', $trainerId)
            ->where('client_id', $clientId)
            ->delete();

        return response()->json(['message' => 'Клиент откреплён']);
    }

    // ─────────────────────────────────────────────────────
    // Детали клиента + статистика + карточка + замеры
    // GET /api/v1/trainer/clients/{clientId}
    // ─────────────────────────────────────────────────────
    public function show(int $clientId): JsonResponse
    {
        $trainerId = $this->trainerPersonId();

        $client = Client::with(['person'])->findOrFail($clientId);

        // Убеждаемся, что клиент закреплён за этим тренером
        $attached = \DB::table('trainer_clients')
            ->where('trainer_id', $trainerId)
            ->where('client_id', $clientId)
            ->exists();

        if (!$attached) {
            return response()->json(['message' => 'Клиент не закреплён'], 403);
        }

        $card = TrainerClientCard::where('trainer_id', $trainerId)
            ->where('client_id', $clientId)
            ->first();

        $measurements = ClientMeasurement::where('trainer_id', $trainerId)
            ->where('client_id', $clientId)
            ->orderBy('measured_at')
            ->get();

        // Статистика
        $totalVisits = Visit::where('client_id', $clientId)->count();

        $mySessionIds = Session::where('trainer_id', $trainerId)->pluck('id');
        $myVisits = Visit::where('client_id', $clientId)
            ->whereIn('session_id', $mySessionIds)
            ->orderByDesc('visited_at')
            ->get();

        $lastMyVisit = $myVisits->first();

        // Посещений за последние 30 дней (у всех тренеров)
        $visits30 = Visit::where('client_id', $clientId)
            ->where('visited_at', '>=', now()->subDays(30))
            ->count();

        return response()->json([
            'data' => [
                'client' => [
                    'id'        => $client->person_id,
                    'full_name' => $client->person->full_name,
                    'phone'     => $client->person->phone,
                    'birth_date' => $client->person->birth_date?->toDateString(),
                    'status'    => $client->status,
                ],
                'stats' => [
                    'total_visits'    => $totalVisits,
                    'my_visits_count' => $myVisits->count(),
                    'visits_30_days'  => $visits30,
                    'last_my_visit'   => $lastMyVisit?->visited_at->toDateTimeString(),
                ],
                'card' => $card ? [
                    'id'                => $card->id,
                    'training_goal'     => $card->training_goal,
                    'contraindications' => $card->contraindications,
                    'notes'             => $card->notes,
                    'updated_at'        => $card->updated_at?->toDateTimeString(),
                ] : null,
                'measurements' => $measurements->map(fn ($m) => $this->formatMeasurement($m)),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────
    // Создать/обновить карточку
    // PUT /api/v1/trainer/clients/{clientId}/card
    // ─────────────────────────────────────────────────────
    public function upsertCard(Request $request, int $clientId): JsonResponse
    {
        $trainerId = $this->trainerPersonId();

        $request->validate([
            'training_goal'     => 'nullable|string|max:1000',
            'contraindications' => 'nullable|string|max:1000',
            'notes'             => 'nullable|string|max:2000',
        ]);

        $card = TrainerClientCard::updateOrCreate(
            ['trainer_id' => $trainerId, 'client_id' => $clientId],
            $request->only(['training_goal', 'contraindications', 'notes'])
        );

        return response()->json([
            'message' => 'Карточка сохранена',
            'data' => [
                'id'                => $card->id,
                'training_goal'     => $card->training_goal,
                'contraindications' => $card->contraindications,
                'notes'             => $card->notes,
                'updated_at'        => $card->updated_at?->toDateTimeString(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────
    // Добавить замер
    // POST /api/v1/trainer/clients/{clientId}/measurements
    // ─────────────────────────────────────────────────────
    public function addMeasurement(Request $request, int $clientId): JsonResponse
    {
        $trainerId = $this->trainerPersonId();

        $request->validate([
            'measured_at' => 'required|date',
            'weight'      => 'nullable|numeric|min:1|max:500',
            'height'      => 'nullable|numeric|min:50|max:300',
            'chest'       => 'nullable|numeric|min:1|max:300',
            'waist'       => 'nullable|numeric|min:1|max:300',
            'hips'        => 'nullable|numeric|min:1|max:300',
            'body_fat'    => 'nullable|numeric|min:0|max:100',
            'notes'       => 'nullable|string|max:500',
        ]);

        $measurement = ClientMeasurement::create([
            'trainer_id'  => $trainerId,
            'client_id'   => $clientId,
            'measured_at' => $request->input('measured_at'),
            'weight'      => $request->input('weight'),
            'height'      => $request->input('height'),
            'chest'       => $request->input('chest'),
            'waist'       => $request->input('waist'),
            'hips'        => $request->input('hips'),
            'body_fat'    => $request->input('body_fat'),
            'notes'       => $request->input('notes'),
        ]);

        return response()->json([
            'message' => 'Замер добавлен',
            'data'    => $this->formatMeasurement($measurement),
        ], 201);
    }

    // ─────────────────────────────────────────────────────
    // Удалить замер
    // DELETE /api/v1/trainer/clients/{clientId}/measurements/{id}
    // ─────────────────────────────────────────────────────
    public function deleteMeasurement(int $clientId, int $measurementId): JsonResponse
    {
        $trainerId = $this->trainerPersonId();

        $measurement = ClientMeasurement::where('id', $measurementId)
            ->where('trainer_id', $trainerId)
            ->where('client_id', $clientId)
            ->firstOrFail();

        $measurement->delete();

        return response()->json(['message' => 'Замер удалён']);
    }

    // ─────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────
    private function formatClientRow(Client $client, int $trainerId): array
    {
        $mySessionIds = Session::where('trainer_id', $trainerId)->pluck('id');

        $myVisits = Visit::where('client_id', $client->person_id)
            ->whereIn('session_id', $mySessionIds)
            ->orderByDesc('visited_at')
            ->get();

        $lastMeasurement = ClientMeasurement::where('trainer_id', $trainerId)
            ->where('client_id', $client->person_id)
            ->orderByDesc('measured_at')
            ->first();

        return [
            'id'               => $client->person_id,
            'full_name'        => $client->person->full_name,
            'phone'            => $client->person->phone,
            'status'           => $client->status,
            'my_visits_count'  => $myVisits->count(),
            'last_my_visit'    => $myVisits->first()?->visited_at->toDateTimeString(),
            'last_measurement' => $lastMeasurement?->measured_at->toDateString(),
        ];
    }

    private function formatMeasurement(ClientMeasurement $m): array
    {
        return [
            'id'          => $m->id,
            'measured_at' => $m->measured_at->toDateString(),
            'weight'      => $m->weight ? (float) $m->weight : null,
            'height'      => $m->height ? (float) $m->height : null,
            'chest'       => $m->chest  ? (float) $m->chest  : null,
            'waist'       => $m->waist  ? (float) $m->waist  : null,
            'hips'        => $m->hips   ? (float) $m->hips   : null,
            'body_fat'    => $m->body_fat ? (float) $m->body_fat : null,
            'notes'       => $m->notes,
        ];
    }
}
