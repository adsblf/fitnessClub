<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BookingRequest;
use App\Models\Booking;
use App\Models\Client;
use App\Models\Session;
use Illuminate\Http\JsonResponse;

class BookingController extends Controller
{
    /**
     * POST /api/v1/bookings
     * Записать клиента на занятие.
     *
     * Проверки по диаграмме последовательности:
     * 1. Занятие существует и ЗАПЛАНИРОВАНО
     * 2. Есть свободные места (для групповых)
     * 3. У клиента есть активный абонемент
     * 4. Клиент ещё не записан на это занятие
     */
    public function store(BookingRequest $request): JsonResponse
    {
        $data = $request->validated();

        $client = Client::findOrFail($data['client_id']);
        $session = Session::with('groupSession')->findOrFail($data['session_id']);

        // Проверка 1: статус занятия
        if ($session->status !== 'scheduled') {
            return response()->json([
                'message' => 'Занятие отменено или уже завершено',
            ], 409);
        }

        // Проверка 2: свободные места (только для групповых)
        if ($session->isGroup() && $session->groupSession) {
            if ($session->groupSession->isFull()) {
                return response()->json([
                    'message' => 'Все места заняты (свободных: 0)',
                ], 409);
            }
        }

        // Проверка 3: активный абонемент
        $membership = $client->getActiveMembership();
        if (!$membership) {
            return response()->json([
                'message' => 'У клиента нет активного абонемента',
            ], 409);
        }

        if ($membership->remaining_visits <= 0) {
            return response()->json([
                'message' => 'На абонементе не осталось посещений',
            ], 409);
        }

        // Проверка 4: не записан ли уже
        $alreadyBooked = Booking::where('client_id', $client->person_id)
            ->where('session_id', $session->id)
            ->whereIn('status', ['booked', 'confirmed'])
            ->exists();

        if ($alreadyBooked) {
            return response()->json([
                'message' => 'Клиент уже записан на это занятие',
            ], 409);
        }

        // Создаём запись
        $booking = Booking::create([
            'client_id'  => $client->person_id,
            'session_id' => $session->id,
            'status'     => 'booked',
        ]);

        $booking->load(['client.person', 'session.groupSession']);

        return response()->json([
            'message' => 'Запись на занятие создана',
            'data'    => $this->formatBooking($booking),
        ], 201);
    }

    /**
     * DELETE /api/v1/bookings/{id}
     * Отменить запись на занятие.
     */
    public function destroy(int $id): JsonResponse
    {
        $booking = Booking::findOrFail($id);

        if (!$booking->isActive()) {
            return response()->json([
                'message' => 'Запись уже отменена или истекла',
            ], 409);
        }

        $booking->cancel();

        return response()->json([
            'message' => 'Запись отменена',
        ]);
    }

    /**
     * GET /api/v1/sessions/{sessionId}/bookings
     * Список записей на конкретное занятие.
     */
    public function sessionBookings(int $sessionId): JsonResponse
    {
        $bookings = Booking::with(['client.person'])
            ->where('session_id', $sessionId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $bookings->map(fn ($b) => $this->formatBooking($b)),
        ]);
    }

    private function formatBooking(Booking $b): array
    {
        return [
            'id'          => $b->id,
            'client_id'   => $b->client_id,
            'client_name' => $b->client->person->full_name ?? null,
            'session_id'  => $b->session_id,
            'status'      => $b->status,
            'created_at'  => $b->created_at->toDateTimeString(),
        ];
    }
}
