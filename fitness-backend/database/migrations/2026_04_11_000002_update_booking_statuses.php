<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Обновление статусов в таблице bookings:
 * Старые статусы: booked, confirmed, cancelled, expired
 * Новые статусы: pending (ожидает подтверждения админа), confirmed (подтверждено), rejected (отклонено), cancelled (отменено клиентом)
 */
return new class extends Migration
{
    public function up(): void
    {
        // Обновляем существующие записи со статусом 'booked' на 'pending'
        DB::table('bookings')
            ->where('status', 'booked')
            ->update(['status' => 'pending']);

        // 'confirmed' и 'cancelled' остаются без изменений
        // 'expired' заменяем на 'cancelled' (или оставляем как есть, в зависимости от логики)
    }

    public function down(): void
    {
        // Откатываем 'pending' обратно на 'booked'
        DB::table('bookings')
            ->where('status', 'pending')
            ->update(['status' => 'booked']);
    }
};

