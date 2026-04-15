<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Добавляет к таблице payments поля для поддержки оплаты персональных занятий
 * и пополнения баланса клиента.
 *
 * personal_session_id — FK на sessions (для оплаты персонального занятия)
 * purpose             — тип платежа: membership | personal_session | balance_topup
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('personal_session_id')
                ->nullable()
                ->after('membership_id')
                ->constrained('sessions')
                ->nullOnDelete();

            $table->string('purpose', 30)
                ->default('membership')
                ->after('personal_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['personal_session_id']);
            $table->dropColumn(['personal_session_id', 'purpose']);
        });
    }
};
