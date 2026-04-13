<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BookingRequest;
use App\Models\Booking;
use App\Models\Client;
use App\Models\PersonalSession;
use App\Models\Session;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    /**
     * POST /api/v1/bookings
     * Записать клиента на занятие.
     *
     * Запись создаётся со статусом "pending" (ожидает подтверждения администратором).
     * Место на занятии не резервируется до подтверждения админом.
     *
     * Проверки:
     * 1. Занятие существует и ЗАПЛАНИРОВАНО
     * 3. У клиента есть активный абонемент с оставшимися посещениями
     * 4. Клиент ещё не записан на это занятие (pending или confirmed)
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

        // Проверка 4: не записан ли уже (pending или confirmed)
        $alreadyBooked = Booking::where('client_id', $client->person_id)
            ->where('session_id', $session->id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        if ($alreadyBooked) {
            return response()->json([
                'message' => 'Клиент уже записан на это занятие',
            ], 409);
        }

        // Создаём запись со статусом "pending"
        $booking = Booking::create([
            'client_id'  => $client->person_id,
            'session_id' => $session->id,
            'status'     => 'pending',
        ]);

        $booking->load(['client.person', 'session.groupSession']);

        return response()->json([
            'message' => 'Запись создана и отправлена на подтверждение администратору',
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
     * POST /api/v1/bookings/{id}/approve
     * Подтвердить запись (администратор).
     *
     * Проверки:
     * 1. Запись существует и в статусе "pending"
     * 2. Для групповых занятий: есть свободные места
     * 3. Клиент всё ещё имеет активный абонемент
     */
    public function approve(int $id): JsonResponse
    {
        $booking = Booking::with(['client', 'session.groupSession'])->findOrFail($id);

        // Проверка 1: статус pending
        if (!$booking->isPending()) {
            return response()->json([
                'message' => 'Запись не в статусе "ожидает подтверждения"',
            ], 409);
        }

        $session = $booking->session;
        $client = $booking->client;

        // Проверка 2: свободные места (только для групповых)
        if ($session->isGroup() && $session->groupSession) {
            if ($session->groupSession->isFull()) {
                return response()->json([
                    'message' => 'Все места на занятии заняты. Невозможно подтвердить запись.',
                ], 409);
            }
        }

        // Проверка 3: активный абонемент клиента
        $membership = $client->getActiveMembership();
        if (!$membership || $membership->remaining_visits <= 0) {
            return response()->json([
                'message' => 'У клиента больше нет активного абонемента или закончились посещения',
            ], 409);
        }

        // Подтверждаем запись (администратор_id установится автоматически через auth)
        $administratorId = auth()->user()->person()->first()?->id ?? auth()->id();
        if (!$administratorId) {
            return response()->json([
                'message' => 'Ошибка: не удалось определить администратора',
            ], 500);
        }
        $booking->approve($administratorId);

        $booking->load(['client.person', 'session.groupSession']);

        return response()->json([
            'message' => 'Запись подтверждена',
            'data'    => $this->formatBooking($booking),
        ]);
    }

    /**
     * POST /api/v1/bookings/{id}/reject
     * Отклонить запись (администратор).
     *
     * Проверка: запись существует и в статусе "pending"
     */
    public function reject(int $id): JsonResponse
    {
        $booking = Booking::findOrFail($id);

        // Проверка: статус pending
        if (!$booking->isPending()) {
            return response()->json([
                'message' => 'Запись не в статусе "ожидает подтверждения"',
            ], 409);
        }

        // Отклоняем запись (администратор_id установится автоматически через auth)
        $administratorId = auth()->user()->person()->first()?->id ?? auth()->id();
        if (!$administratorId) {
            return response()->json([
                'message' => 'Ошибка: не удалось определить администратора',
            ], 500);
        }
        $booking->reject($administratorId);

        $booking->load(['client.person', 'session.groupSession']);

        return response()->json([
            'message' => 'Запись отклонена',
            'data'    => $this->formatBooking($booking),
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

    /**
     * GET /api/v1/clients/{clientId}/bookings
     * Получить все записи клиента на занятия.
     * Включает как самостоятельные записи (bookings), так и персональные тренировки,
     * назначенные администратором (personal_sessions).
     */
    public function clientBookings(int $clientId): JsonResponse
    {
        // 1. Обычные записи клиента (через таблицу bookings)
        $bookings = Booking::with(['session.groupSession', 'session.trainer.person', 'session.hall'])
            ->where('client_id', $clientId)
            ->orderByDesc('created_at')
            ->get();

        $bookedSessionIds = $bookings->pluck('session_id')->all();

        // 2. Персональные тренировки, назначенные администратором
        // Исключаем те, для которых уже есть запись в bookings (чтобы не дублировать)
        $personalSessions = PersonalSession::with(['session.trainer.person', 'session.hall'])
            ->where('client_id', $clientId)
            ->whereNotIn('session_id', $bookedSessionIds)
            ->get();

        $data = collect()
            ->merge($bookings->map(fn ($b) => $this->formatClientBooking($b)))
            ->merge($personalSessions->map(fn ($ps) => $this->formatPersonalSessionAsBooking($ps)))
            ->sortByDesc('datetime_start')
            ->values();

        return response()->json([
            'data' => $data,
        ]);
    }

    private function formatPersonalSessionAsBooking(PersonalSession $ps): array
    {
        $session = $ps->session;
        $statusMap = [
            'scheduled' => 'confirmed',
            'completed' => 'completed',
            'cancelled' => 'cancelled',
        ];
        return [
            'id'               => 'ps_' . $ps->session_id,
            'session_id'       => $ps->session_id,
            'status'           => $statusMap[$session->status] ?? 'confirmed',
            'source'           => 'personal_session',
            'session_name'     => 'Персональная тренировка',
            'session_type'     => 'personal',
            'type'             => 'personal',
            'trainer_name'     => $session->trainer?->person?->full_name ?? 'Не назначен',
            'hall'             => $session->hall
                ? ['id' => $session->hall->id, 'number' => $session->hall->number]
                : null,
            'time_start'       => $session->starts_at->format('H:i'),
            'time_end'         => $session->ends_at->format('H:i'),
            'date'             => $session->starts_at->toDateString(),
            'datetime_start'   => $session->starts_at->toDateTimeString(),
            'datetime_end'     => $session->ends_at->toDateTimeString(),
            'duration'         => $session->starts_at->diffInMinutes($session->ends_at),
            'difficulty_level' => null,
        ];
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

    private function formatClientBooking(Booking $b): array
    {
        $session = $b->session;
        $data = [
            'id'               => $b->id,
            'session_id'       => $b->session_id,
            'status'           => $b->status,
            'session_name'     => $session->groupSession?->name ?? 'Персональная тренировка',
            'trainer_name'     => $session->trainer?->person?->full_name ?? 'Не назначен',
            'hall'             => $session->hall ? ['id' => $session->hall->id, 'number' => $session->hall->number] : null,
            'time_start'       => $session->starts_at->format('H:i'),
            'time_end'         => $session->ends_at->format('H:i'),
            'date'             => $session->starts_at->toDateString(),
            'datetime_start'   => $session->starts_at->toDateTimeString(),
            'datetime_end'     => $session->ends_at->toDateTimeString(),
            'duration'         => $session->starts_at->diffInMinutes($session->ends_at),
            'difficulty_level' => $session->groupSession?->difficulty_level ?? null,
            'type'             => $session->isGroup() ? 'group' : 'personal',
            'created_at'       => $b->created_at->toDateTimeString(),
        ];

        // Добавляем информацию о местах для групповых занятий
        if ($session->isGroup() && $session->groupSession) {
            $data['max_participants'] = $session->groupSession->max_participants;
            $data['registered'] = $session->groupSession->getRegisteredCount();
        }

        return $data;
    }
}
