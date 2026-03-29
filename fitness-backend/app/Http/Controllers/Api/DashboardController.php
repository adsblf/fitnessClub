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
     */
    public function index(): JsonResponse
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

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
                })->whereIn('status', ['booked', 'confirmed'])->count(),
            ],
        ]);
    }
}
