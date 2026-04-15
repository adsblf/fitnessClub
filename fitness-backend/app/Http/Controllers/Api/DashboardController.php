<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Membership;
use App\Models\MembershipType;
use App\Models\Payment;
use App\Models\Visit;
use App\Models\Booking;
use App\Models\Session;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            ->filter(fn($b) => $b->session && $b->session->ends_at < $now);

        foreach ($expiredPending as $booking) {
            $booking->rejectBySystem();
        }

        return response()->json([
            'data' => [
                // Выручка сегодня (за вычетом возвратов)
                'revenue_today' => Payment::whereDate('paid_at', $today)
                    ->whereIn('status', ['success', 'refund'])
                    ->sum('amount'),

                // Выручка за месяц (за вычетом возвратов)
                'revenue_month' => Payment::whereDate('paid_at', '>=', $monthStart)
                    ->whereIn('status', ['success', 'refund'])
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

                // ── Графики: посещения по дням (30 дней) ──
                'visits_per_day' => $this->visitsPerDay(30),

                // ── Графики: выручка по дням (30 дней) ──
                'revenue_per_day' => $this->revenuePerDay(30),

                // ── Статусы абонементов ──
                'membership_status_breakdown' => $this->membershipStatusBreakdown(),

                // ── Разбивка по типам абонементов ──
                'membership_type_breakdown' => $this->membershipTypeBreakdown(),

                // ── Посещения по типам ──
                'visits_by_type' => $this->visitsByType(),

                // ── Топ-5 тренеров по посещениям за месяц ──
                'top_trainers' => $this->topTrainers($monthStart),

                // ── Новые клиенты по дням (30 дней) ──
                'new_clients_per_day' => $this->newClientsPerDay(30),

                // ── Процент заполняемости занятий (топ-5 за месяц) ──
                'top_sessions_attendance' => $this->topSessionsAttendance($monthStart),

                // ── Посещений за прошлый месяц (для сравнения) ──
                'visits_last_month' => Visit::whereDate('visited_at', '>=', now()->subMonth()->startOfMonth()->toDateString())
                    ->whereDate('visited_at', '<', $monthStart)
                    ->count(),

                // ── Выручка за прошлый месяц ──
                'revenue_last_month' => Payment::whereDate('paid_at', '>=', now()->subMonth()->startOfMonth()->toDateString())
                    ->whereDate('paid_at', '<', $monthStart)
                    ->whereIn('status', ['success', 'refund'])
                    ->sum('amount'),
            ],
        ]);
    }

    // ── Private analytics helpers ─────────────────────────────────────────

    private function visitsPerDay(int $days): array
    {
        $result = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $result[] = [
                'date'  => $date,
                'count' => Visit::whereDate('visited_at', $date)->count(),
            ];
        }
        return $result;
    }

    private function revenuePerDay(int $days): array
    {
        $result = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $result[] = [
                'date'   => $date,
                'amount' => (float) Payment::whereDate('paid_at', $date)
                    ->whereIn('status', ['success', 'refund'])
                    ->sum('amount'),
            ];
        }
        return $result;
    }

    private function membershipStatusBreakdown(): array
    {
        $statuses = ['active', 'frozen', 'expired', 'cancelled'];
        $result = [];
        foreach ($statuses as $status) {
            $result[] = [
                'status' => $status,
                'count'  => Membership::where('status', $status)->count(),
            ];
        }
        return $result;
    }

    private function membershipTypeBreakdown(): array
    {
        return MembershipType::withCount(['memberships' => function ($q) {
                $q->where('status', 'active');
            }])
            ->get()
            ->map(fn($t) => [
                'name'  => $t->name,
                'count' => $t->memberships_count,
            ])
            ->toArray();
    }

    private function visitsByType(): array
    {
        $free      = Visit::whereNull('session_id')->count();
        $group     = Visit::whereHas('session', fn($q) => $q->where('type', 'group'))->count();
        $personal  = Visit::whereHas('session', fn($q) => $q->where('type', 'personal'))->count();

        return [
            ['type' => 'Свободное', 'count' => $free],
            ['type' => 'Групповое', 'count' => $group],
            ['type' => 'Персональное', 'count' => $personal],
        ];
    }

    private function topTrainers(string $monthStart): array
    {
        return \App\Models\Trainer::with('person')
            ->withCount(['sessions' => function ($q) use ($monthStart) {
                $q->where('status', 'completed')
                  ->whereDate('starts_at', '>=', $monthStart);
            }])
            ->orderByDesc('sessions_count')
            ->limit(5)
            ->get()
            ->map(fn($t) => [
                'name'           => $t->person->full_name ?? 'Тренер #' . $t->person_id,
                'sessions_count' => $t->sessions_count,
            ])
            ->toArray();
    }

    private function newClientsPerDay(int $days): array
    {
        $result = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $result[] = [
                'date'  => $date,
                'count' => Client::whereDate('registration_date', $date)->count(),
            ];
        }
        return $result;
    }

    private function topSessionsAttendance(string $monthStart): array
    {
        return Session::with('groupSession')
            ->where('type', 'group')
            ->whereDate('starts_at', '>=', $monthStart)
            ->where('status', 'completed')
            ->withCount(['visits'])
            ->orderByDesc('visits_count')
            ->limit(20)
            ->get()
            ->filter(fn($s) => $s->visits_count > 0)
            ->take(5)
            ->map(fn($s) => [
                'name'     => $s->groupSession->name ?? 'Занятие #' . $s->id,
                'date'     => $s->starts_at->toDateString(),
                'time'     => $s->starts_at->format('H:i'),
                'visits'   => $s->visits_count,
                'capacity' => $s->groupSession->max_participants ?? 0,
                'percent'  => ($s->groupSession->max_participants ?? 0) > 0
                    ? round($s->visits_count / $s->groupSession->max_participants * 100)
                    : 0,
            ])
            ->values()
            ->toArray();
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
            if ($booking->session && $booking->session->ends_at < $now) {
                $booking->rejectBySystem();
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

    /**
     * GET /api/v1/sales
     * История продаж (успешные платежи) с фильтрами и агрегированной статистикой.
     */
    public function salesHistory(Request $request): JsonResponse
    {
        $dateFrom = $request->input('date_from');
        $dateTo   = $request->input('date_to');
        $clientId = $request->input('client_id');
        $view     = $request->input('view', 'transactions'); // transactions | clients
        $perPage  = min((int) $request->input('per_page', 25), 100);

        // ── Базовый запрос ──────────────────────────────────────────────
        // Включаем успешные платежи и возвраты (возвраты имеют отрицательную сумму)
        $baseQuery = Payment::whereIn('status', ['success', 'refund']);

        if ($dateFrom) $baseQuery->whereDate('paid_at', '>=', $dateFrom);
        if ($dateTo)   $baseQuery->whereDate('paid_at', '<=', $dateTo);
        if ($clientId) $baseQuery->where('client_id', $clientId);

        // ── Сводная статистика ─────────────────────────────────────────
        $summaryQuery = clone $baseQuery;
        $totalAmount  = (float) $summaryQuery->sum('amount');
        $totalCount   = $summaryQuery->count();
        $avgAmount    = $totalCount > 0 ? round($totalAmount / $totalCount, 2) : 0;

        // ── Топ клиентов (для боковой панели, всегда без фильтра по клиенту) ──
        $topClientsQuery = Payment::select(
                'client_id',
                DB::raw('SUM(amount) as total_amount'),
                DB::raw('COUNT(*) as sales_count')
            )
            ->whereIn('status', ['success', 'refund']);
        if ($dateFrom) $topClientsQuery->whereDate('paid_at', '>=', $dateFrom);
        if ($dateTo)   $topClientsQuery->whereDate('paid_at', '<=', $dateTo);

        $topClientRows = $topClientsQuery
            ->groupBy('client_id')
            ->orderByDesc('total_amount')
            ->limit(10)
            ->get();

        // Догружаем данные клиентов
        $clientIds = $topClientRows->pluck('client_id')->all();
        $clientMap = Client::with('person')
            ->whereIn('person_id', $clientIds)
            ->get()
            ->keyBy('person_id');

        $topClients = $topClientRows->map(fn ($row) => [
            'client_id'   => $row->client_id,
            'client_name' => $clientMap[$row->client_id]?->person?->full_name ?? 'Клиент #' . $row->client_id,
            'total_amount'=> (float) $row->total_amount,
            'sales_count' => (int) $row->sales_count,
        ])->values()->all();

        // ── Представление: список по клиентам ─────────────────────────
        if ($view === 'clients') {
            $clientsQuery = Payment::select(
                    'client_id',
                    DB::raw('SUM(amount) as total_amount'),
                    DB::raw('COUNT(*) as sales_count'),
                    DB::raw('AVG(amount) as avg_amount'),
                    DB::raw('MAX(paid_at) as last_purchase')
                )
                ->whereIn('status', ['success', 'refund']);
            if ($dateFrom) $clientsQuery->whereDate('paid_at', '>=', $dateFrom);
            if ($dateTo)   $clientsQuery->whereDate('paid_at', '<=', $dateTo);
            if ($clientId) $clientsQuery->where('client_id', $clientId);

            $paginated = $clientsQuery
                ->groupBy('client_id')
                ->orderByDesc('total_amount')
                ->paginate($perPage);

            $allClientIds   = $paginated->pluck('client_id')->all();
            $allClientsMap  = Client::with('person')
                ->whereIn('person_id', $allClientIds)
                ->get()
                ->keyBy('person_id');

            $rows = $paginated->map(fn ($row) => [
                'client_id'    => $row->client_id,
                'client_name'  => $allClientsMap[$row->client_id]?->person?->full_name ?? 'Клиент #' . $row->client_id,
                'total_amount' => (float) $row->total_amount,
                'sales_count'  => (int) $row->sales_count,
                'avg_amount'   => round((float) $row->avg_amount, 2),
                'last_purchase'=> $row->last_purchase,
            ]);

            return response()->json([
                'data'    => $rows,
                'meta'    => [
                    'current_page' => $paginated->currentPage(),
                    'last_page'    => $paginated->lastPage(),
                    'per_page'     => $paginated->perPage(),
                    'total'        => $paginated->total(),
                ],
                'summary' => [
                    'total_amount' => $totalAmount,
                    'total_count'  => $totalCount,
                    'avg_amount'   => $avgAmount,
                ],
                'top_clients' => $topClients,
            ]);
        }

        // ── Представление: транзакции ──────────────────────────────────
        $paginated = $baseQuery
            ->with(['client.person', 'membership.membershipType', 'promoCode'])
            ->orderByDesc('paid_at')
            ->paginate($perPage);

        $rows = $paginated->map(fn ($p) => [
            'id'               => $p->id,
            'paid_at'          => $p->paid_at?->toDateTimeString(),
            'client_id'        => $p->client_id,
            'client_name'      => $p->client?->person?->full_name ?? 'Клиент #' . $p->client_id,
            'membership_type'  => $p->membership?->membershipType?->name ?? '—',
            'membership_number'=> $p->membership?->membership_number ?? null,
            'amount'           => (float) $p->amount,
            'payment_method'   => $p->payment_method,
            'promo_code'       => $p->promoCode?->code ?? null,
            'transaction_id'   => $p->transaction_id,
            'purpose'          => $p->purpose ?? 'membership',
            'status'           => $p->status,
            'is_refund'        => $p->status === 'refund',
        ]);

        return response()->json([
            'data'    => $rows,
            'meta'    => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
            'summary' => [
                'total_amount' => $totalAmount,
                'total_count'  => $totalCount,
                'avg_amount'   => $avgAmount,
            ],
            'top_clients' => $topClients,
        ]);
    }
}
