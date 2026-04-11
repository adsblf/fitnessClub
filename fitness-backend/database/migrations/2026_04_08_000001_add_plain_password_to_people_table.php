<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Добавляет в таблицу people поле plain_password — открытый пароль,
 * который видит только администратор. Нужно для сценария:
 * "клиент забыл пароль, админ смотрит его в карточке".
 *
 * ВАЖНО: в продакшне так делать нельзя. Это решение только для учебного
 * проекта, где задача — дать админу возможность напомнить клиенту пароль.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('people', function (Blueprint $table) {
            $table->string('plain_password', 100)->nullable()->after('registration_address');
        });
    }

    public function down(): void
    {
        Schema::table('people', function (Blueprint $table) {
            $table->dropColumn('plain_password');
        });
    }
};
