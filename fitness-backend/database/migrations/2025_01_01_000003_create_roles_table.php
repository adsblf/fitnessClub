<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "roles" (роль) — справочник ролей системы.
 * 4 роли: Клиент, Тренер, Администратор, Владелец.
 * Заполняется через RoleSeeder.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();                  // название роли
            $table->string('description', 255)->nullable();        // описание
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
