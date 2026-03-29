<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — /api/v1/...
|--------------------------------------------------------------------------
|
| Все маршруты начинаются с /api/v1/.
| Авторизация через Laravel Sanctum (Bearer-токен).
|
*/

Route::prefix('v1')->group(function () {

    // ── Авторизация (публичные) ────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login',    [AuthController::class, 'login']);
    });

    // ── Защищённые маршруты (нужен Bearer-токен) ───────
    Route::middleware('auth:sanctum')->group(function () {

        // Авторизация — logout, me
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me',     [AuthController::class, 'me']);
        });

        // Клиенты — CRUD (admin + owner)
        Route::prefix('clients')->group(function () {
            Route::get('/',     [ClientController::class, 'index'])->middleware('role:admin,owner');
            Route::post('/',    [ClientController::class, 'store'])->middleware('role:admin');
            Route::get('/{id}', [ClientController::class, 'show'])->middleware('role:admin,owner,trainer');
            Route::put('/{id}', [ClientController::class, 'update'])->middleware('role:admin');
            Route::delete('/{id}', [ClientController::class, 'destroy'])->middleware('role:admin');
        });

        // Дашборд (admin + owner)
        Route::get('dashboard', [DashboardController::class, 'index'])
            ->middleware('role:admin,owner');
    });
});
