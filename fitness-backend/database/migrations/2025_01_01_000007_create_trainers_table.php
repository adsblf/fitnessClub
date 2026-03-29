<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "trainers" (тренер) — расширение профиля для роли Тренер.
 * PK = person_id (FK на people). Связь 1:1.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trainers', function (Blueprint $table) {
            $table->foreignId('person_id')->primary()->constrained('people')->cascadeOnDelete();
            $table->string('specialization', 100)->nullable();     // специализация
            $table->string('contact_phone', 20)->nullable();       // контактный телефон
            $table->text('description')->nullable();               // описание / био
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainers');
    }
};
