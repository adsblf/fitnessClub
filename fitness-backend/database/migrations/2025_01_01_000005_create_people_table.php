<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "people" (человек) — профиль пользователя.
 * Связана 1:1 с users. Содержит ФИО, телефон, дату рождения.
 * Является "родительской" для clients, trainers, administrators.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('people', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('full_name', 150);                      // ФИО
            $table->string('phone', 20)->nullable();               // телефон
            $table->date('birth_date')->nullable();                // дата рождения
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('people');
    }
};
