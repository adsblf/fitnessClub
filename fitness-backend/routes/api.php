<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MembershipController;
use App\Http\Controllers\Api\OwnerController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\TrainerClientController;
use App\Http\Controllers\Api\VisitController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — /api/v1/...
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    Route::options('{any}', function() {
        return response()->json([], 200);
    })->where('any', '.*');

    // ── Авторизация (публичные) ────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login',    [AuthController::class, 'login']);
    });

    // ── ПУБЛИЧНЫЕ маршруты для эмулятора эквайринга ────
    // Эмулятор открывается в отдельной вкладке и не имеет токена админа.
    // Поэтому статус платежа и webhook доступны без auth. В продакшне
    // webhook защищался бы подписью от платёжного шлюза.
    Route::get('payments/{id}/status', [MembershipController::class, 'paymentStatus']);
    Route::post('payments/{id}/webhook', [MembershipController::class, 'paymentWebhook']);

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

        Route::get('bookings/pending', [DashboardController::class, 'pendingBookings'])
            ->middleware('role:admin,owner');

        Route::get('sales', [DashboardController::class, 'salesHistory'])
            ->middleware('role:admin,owner');

        // ── Товары (POS — список для продажи) ─────────────────────────
        Route::get('products', [ProductController::class, 'listForSale'])
            ->middleware('role:admin,owner');

        // Продажи товаров
        Route::prefix('product-sales')->middleware('role:admin,owner')->group(function () {
            Route::get('/',             [ProductController::class, 'listSales']);
            Route::post('/',            [ProductController::class, 'createSale']);
            Route::post('/{id}/refund', [ProductController::class, 'refundSale']);
        });

        // Клиенты — CRUD
        Route::prefix('clients')->group(function () {
            Route::get('/search', [ClientController::class, 'search'])->middleware('role:admin,trainer,owner');
            Route::get('/',     [ClientController::class, 'index'])->middleware('role:admin,owner');
            Route::post('/',    [ClientController::class, 'store'])->middleware('role:admin,owner');
            Route::get('/{id}', [ClientController::class, 'show'])->middleware('role:admin,owner,trainer,client');
            Route::put('/{id}', [ClientController::class, 'update'])->middleware('role:admin,owner');
            Route::delete('/{id}', [ClientController::class, 'destroy'])->middleware('role:admin,owner');

            // Абонементы клиента
            Route::get('/{id}/memberships', [MembershipController::class, 'clientMemberships'])
                ->middleware('role:admin,owner,trainer,client');

            // Посещения клиента
            Route::get('/{id}/visits', [VisitController::class, 'clientVisits'])
                ->middleware('role:admin,owner,trainer,client');

            // Записи клиента на занятия
            Route::get('/{id}/bookings', [BookingController::class, 'clientBookings'])
                ->middleware('role:admin,owner,trainer,client');

            // Учётные данные клиента (админ + владелец)
            Route::get('/{id}/credentials', [MembershipController::class, 'clientCredentials'])
                ->middleware('role:admin,owner');

            // Пополнение баланса клиента
            Route::post('/{id}/balance/topup', [ClientController::class, 'topupBalance'])
                ->middleware('role:admin,owner,client');
        });

        // Расписание
        Route::prefix('schedule')->group(function () {
            Route::get('/',              [ScheduleController::class, 'index']);
            Route::get('/{id}',          [ScheduleController::class, 'show']);
            Route::post('/',             [ScheduleController::class, 'store'])->middleware('role:admin,trainer,owner');
            Route::put('/{id}',          [ScheduleController::class, 'update'])->middleware('role:admin,trainer,owner');
            Route::post('/auto-complete',[ScheduleController::class, 'autoComplete'])->middleware('role:admin,trainer,owner');
            Route::post('/{id}/cancel',  [ScheduleController::class, 'cancel'])->middleware('role:admin,trainer,owner,client');
        });

        // Справочники
        Route::get('halls',    [ScheduleController::class, 'halls']);
        Route::get('trainers', [ScheduleController::class, 'trainers']);

        // Типы абонементов (справочник)
        Route::get('membership-types', [MembershipController::class, 'types']);

        // Расчёт цены доступен админу и клиенту
        Route::post('memberships/calculate-price', [MembershipController::class, 'calculatePrice'])
            ->middleware('role:admin,client,owner');

        // Клиентские маршруты управления абонементом
        Route::post('memberships/self-renew',          [MembershipController::class, 'selfRenew'])->middleware('role:client');
        Route::post('memberships/{id}/self-freeze',    [MembershipController::class, 'selfFreeze'])->middleware('role:client');
        Route::post('memberships/{id}/self-unfreeze',  [MembershipController::class, 'selfUnfreeze'])->middleware('role:client');

        // Абонементы — управление
        Route::prefix('memberships')->group(function () {
            Route::get('/',                 [MembershipController::class, 'index'])->middleware('role:admin,owner');
            Route::post('/',                [MembershipController::class, 'store'])->middleware('role:admin,owner');
            Route::post('/{id}/freeze',     [MembershipController::class, 'freeze'])->middleware('role:admin,owner');
            Route::post('/{id}/unfreeze',   [MembershipController::class, 'unfreeze'])->middleware('role:admin,owner');
            Route::post('/{id}/cancel',     [MembershipController::class, 'cancel'])->middleware('role:admin,owner');
        });

        // Записи на занятия
        Route::prefix('bookings')->group(function () {
            Route::post('/',       [BookingController::class, 'store'])->middleware('role:admin,client,owner');
            Route::delete('/{id}', [BookingController::class, 'destroy'])->middleware('role:admin,client,owner');
            Route::post('/{id}/approve', [BookingController::class, 'approve'])->middleware('role:admin,owner');
            Route::post('/{id}/reject',  [BookingController::class, 'reject'])->middleware('role:admin,owner');
        });

        // Список записей на конкретное занятие
        Route::get('sessions/{id}/bookings', [BookingController::class, 'sessionBookings'])
            ->middleware('role:admin,trainer,owner');

        // Посещения
        Route::prefix('visits')->group(function () {
            Route::get('/sessions-with-visits', [VisitController::class, 'sessionsWithVisits'])->middleware('role:admin,trainer,owner');
            Route::post('/',      [VisitController::class, 'store'])->middleware('role:admin,trainer,owner');
            Route::put('/{id}',   [VisitController::class, 'update'])->middleware('role:admin,trainer,owner');
            Route::get('/',       [VisitController::class, 'index'])->middleware('role:admin,owner');
        });

        // ── Тренер — управление своими клиентами ─────────────────────
        Route::prefix('trainer')->middleware('role:trainer')->group(function () {
            Route::get('clients',                                             [TrainerClientController::class, 'index']);
            Route::post('clients',                                            [TrainerClientController::class, 'attach']);
            Route::delete('clients/{clientId}',                              [TrainerClientController::class, 'detach']);
            Route::get('clients/{clientId}',                                 [TrainerClientController::class, 'show']);
            Route::put('clients/{clientId}/card',                            [TrainerClientController::class, 'upsertCard']);
            Route::post('clients/{clientId}/measurements',                   [TrainerClientController::class, 'addMeasurement']);
            Route::delete('clients/{clientId}/measurements/{measurementId}', [TrainerClientController::class, 'deleteMeasurement']);
        });

        // ── Владелец — суперпользователь ────────────────────────────
        Route::prefix('owner')->middleware('role:owner')->group(function () {
            // Персонал
            Route::get('staff',          [OwnerController::class, 'listStaff']);
            Route::post('staff',         [OwnerController::class, 'storeStaff']);
            Route::put('staff/{id}',     [OwnerController::class, 'updateStaff']);
            Route::delete('staff/{id}',  [OwnerController::class, 'destroyStaff']);

            // Тарифные планы
            Route::get('membership-types',         [OwnerController::class, 'listMembershipTypes']);
            Route::post('membership-types',        [OwnerController::class, 'storeMembershipType']);
            Route::put('membership-types/{id}',    [OwnerController::class, 'updateMembershipType']);
            Route::delete('membership-types/{id}', [OwnerController::class, 'destroyMembershipType']);

            // Промокоды
            Route::get('promo-codes',          [OwnerController::class, 'listPromoCodes']);
            Route::post('promo-codes',         [OwnerController::class, 'storePromoCode']);
            Route::put('promo-codes/{id}',     [OwnerController::class, 'updatePromoCode']);
            Route::delete('promo-codes/{id}',  [OwnerController::class, 'destroyPromoCode']);

            // Каталог товаров
            Route::get('product-categories',          [ProductController::class, 'indexCategories']);
            Route::post('product-categories',         [ProductController::class, 'storeCategory']);
            Route::put('product-categories/{id}',     [ProductController::class, 'updateCategory']);
            Route::delete('product-categories/{id}',  [ProductController::class, 'destroyCategory']);

            Route::get('products',               [ProductController::class, 'index']);
            Route::post('products',              [ProductController::class, 'store']);
            Route::put('products/{id}',          [ProductController::class, 'update']);
            Route::delete('products/{id}',       [ProductController::class, 'destroy']);
            Route::post('products/{id}/restock', [ProductController::class, 'restock']);
        });
    });
});
