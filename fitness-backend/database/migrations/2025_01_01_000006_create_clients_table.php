<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "clients" (клиент) — расширение профиля для роли Клиент.
 * PK = person_id (FK на people). Связь 1:1.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->foreignId('person_id')->primary()->constrained('people')->cascadeOnDelete();
            $table->date('registration_date');                     // дата регистрации
            $table->string('status', 20)->default('active');       // active / inactive / blocked
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
