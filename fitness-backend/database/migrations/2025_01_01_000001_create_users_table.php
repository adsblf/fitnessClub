<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "users" (пользователь) — центральная таблица авторизации.
 * Соответствует сущности "пользователь" в ER-диаграмме.
 * Каждый пользователь имеет email + пароль для входа в систему.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();                                          // bigint PK
            $table->string('email', 100)->unique();                // уникальный email
            $table->string('password', 255);                       // хэш пароля
            $table->timestamp('email_verified_at')->nullable();    // подтверждение email
            $table->rememberToken();                               // remember_token varchar(100)
            $table->timestamps();                                  // created_at, updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
