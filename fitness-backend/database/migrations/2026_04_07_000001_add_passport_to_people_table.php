<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Добавляет паспортные данные и адрес регистрации в таблицу people.
 * Все поля необязательные.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('people', function (Blueprint $table) {
            $table->string('passport_series', 4)->nullable()->after('birth_date');       // 4 цифры
            $table->string('passport_number', 6)->nullable()->after('passport_series');  // 6 цифр
            $table->date('passport_issued_at')->nullable()->after('passport_number');    // дата выдачи
            $table->string('passport_department_code', 7)->nullable()->after('passport_issued_at'); // nnn-nnn
            $table->string('registration_address', 255)->nullable()->after('passport_department_code');
        });
    }

    public function down(): void
    {
        Schema::table('people', function (Blueprint $table) {
            $table->dropColumn([
                'passport_series',
                'passport_number',
                'passport_issued_at',
                'passport_department_code',
                'registration_address',
            ]);
        });
    }
};
