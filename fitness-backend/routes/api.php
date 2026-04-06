<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MembershipController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\VisitController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — /api/v1/...
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── Авторизация (публичные) ────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login',    [AuthController::class, 'login']);
    });

    // ── Защищённые маршруты ────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me',     [AuthController::class, 'me']);
        });

        // Dashboard
        Route::get('dashboard', [DashboardController::class, 'index'])
            ->middleware('role:admin,owner');

        // Клиенты — CRUD
        Route::prefix('clients')->group(function () {
            Route::get('/',     [ClientController::class, 'index'])->middleware('role:admin,owner');
            Route::post('/',    [ClientController::class, 'store'])->middleware('role:admin');
            Route::get('/{id}', [ClientController::class, 'show'])->middleware('role:admin,owner,trainer');
            Route::put('/{id}', [ClientController::class, 'update'])->middleware('role:admin');
            Route::delete('/{id}', [ClientController::class, 'destroy'])->middleware('role:admin');

            // Абонементы клиента
            Route::get('/{id}/memberships', [MembershipController::class, 'clientMemberships'])
                ->middleware('role:admin,owner,trainer');

            // Посещения клиента
            Route::get('/{id}/visits', [VisitController::class, 'clientVisits'])
                ->middleware('role:admin,owner,trainer');
        });

        // Расписание
        Route::prefix('schedule')->group(function () {
            Route::get('/',     [ScheduleController::class, 'index']);                                  // все авторизованные
            Route::get('/{id}', [ScheduleController::class, 'show']);                                   // все авторизованные
            Route::post('/',    [ScheduleController::class, 'store'])->middleware('role:admin');
            Route::put('/{id}', [ScheduleController::class, 'update'])->middleware('role:admin');
            Route::post('/{id}/cancel', [ScheduleController::class, 'cancel'])->middleware('role:admin');
        });

        // Справочники
        Route::get('halls',    [ScheduleController::class, 'halls']);
        Route::get('trainers', [ScheduleController::class, 'trainers']);

        // Типы абонементов (справочник)
        Route::get('membership-types', [MembershipController::class, 'types']);

        // Абонементы — управление
        Route::prefix('memberships')->middleware('role:admin')->group(function () {
            Route::get('/',             [MembershipController::class, 'index']);
            Route::post('/',            [MembershipController::class, 'store']);
            Route::post('/{id}/freeze', [MembershipController::class, 'freeze']);
            Route::post('/{id}/unfreeze', [MembershipController::class, 'unfreeze']);
        });

        // Записи на занятия
        Route::prefix('bookings')->group(function () {
            Route::post('/',      [BookingController::class, 'store'])->middleware('role:admin,client');
            Route::delete('/{id}', [BookingController::class, 'destroy'])->middleware('role:admin,client');
        });

        // Список записей на конкретное занятие
        Route::get('sessions/{id}/bookings', [BookingController::class, 'sessionBookings'])
            ->middleware('role:admin,trainer');

        // Посещения
        Route::prefix('visits')->group(function () {
            Route::post('/', [VisitController::class, 'store'])->middleware('role:admin,trainer');
            Route::get('/',  [VisitController::class, 'index'])->middleware('role:admin,owner');
        });
    });
});
