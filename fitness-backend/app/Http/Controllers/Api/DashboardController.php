<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Membership;
use App\Models\Payment;
use App\Models\Visit;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * GET /api/v1/dashboard
     * Возвращает ключевые показатели для дашборда администратора.
     * Также автоматически отклоняет pending записи на прошедшие занятия.
     */
    public function index(): JsonResponse
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $now = now();

        // Автоматически отклонить pending записи на прошедшие занятия
        $expiredPending = Booking::with('session')
            ->where('status', 'pending')
            ->get()
            ->filter(fn($b) => $b->session->ends_at < $now);

        foreach ($expiredPending as $booking) {
            $booking->reject(0); // 0 = система
        }

        return response()->json([
            'data' => [
                // Выручка сегодня
                'revenue_today' => Payment::whereDate('paid_at', $today)
                    ->where('status', 'success')
                    ->sum('amount'),

                // Выручка за месяц
                'revenue_month' => Payment::whereDate('paid_at', '>=', $monthStart)
                    ->where('status', 'success')
                    ->sum('amount'),

                // Посещений сегодня
                'visits_today' => Visit::whereDate('visited_at', $today)->count(),

                // Активных абонементов
                'active_memberships' => Membership::where('status', 'active')
                    ->where('end_date', '>=', $today)
                    ->count(),

                // Всего клиентов
                'total_clients' => Client::count(),

                // Новых клиентов за месяц
                'new_clients_month' => Client::where('registration_date', '>=', $monthStart)
                    ->count(),

                // Предстоящих занятий сегодня
                'upcoming_sessions_today' => \App\Models\Session::whereDate('starts_at', $today)
                    ->whereIn('status', ['scheduled', 'in_progress'])
                    ->count(),

                // Записей на сегодня
                'bookings_today' => Booking::whereHas('session', function ($q) use ($today) {
                    $q->whereDate('starts_at', $today);
                })->where('status', 'confirmed')->count(),

                // Ожидающих подтверждения записей (после очистки прошедших)
                'pending_bookings_count' => Booking::where('status', 'pending')->count(),
            ],
        ]);
    }

    /**
     * GET /api/v1/bookings/pending
     * Список всех записей, ожидающих подтверждения администратором.
     *
     * Автоматически отклоняет записи, если тренировка уже прошла.
     */
    public function pendingBookings(): JsonResponse
    {
        // Получить все pending записи с информацией о занятиях
        $pendingBookings = Booking::with(['client.person', 'session.groupSession', 'session.hall', 'session.trainer'])
            ->where('status', 'pending')
            ->get();

        $now = now();

        // Автоматически отклонить записи на прошедшие занятия
        foreach ($pendingBookings as $booking) {
            // Если занятие уже прошло, отклоняем запись
            if ($booking->session->ends_at < $now) {
                $booking->reject(0); // 0 = система (не конкретный администратор)
            }
        }

        // Получить актуальный список (после отклонений)
        $pendingBookings = Booking::with(['client.person', 'session.groupSession', 'session.hall', 'session.trainer'])
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $pendingBookings->map(fn ($b) => [
                'id'            => $b->id,
                'client_id'     => $b->client_id,
                'client_name'   => $b->client->person->full_name ?? null,
                'client_email'  => $b->client->person->email ?? null,
                'session_id'    => $b->session_id,
                'session_name'  => $b->session->groupSession->name ?? 'Персональная тренировка',
                'session_date'  => $b->session->starts_at->toDateString(),
                'session_time'  => $b->session->starts_at->format('H:i') . ' - ' . $b->session->ends_at->format('H:i'),
                'trainer_name'  => $b->session->trainer->person->full_name ?? null,
                'hall_number'   => $b->session->hall->number ?? null,
                'created_at'    => $b->created_at->toDateTimeString(),
                'status'        => $b->status,
            ]),
        ]);
    }
}
