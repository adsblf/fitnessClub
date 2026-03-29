<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "client_cards" (клиентская_карточка) — замеры и цели клиента.
 * Связь 1:1 с clients.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->unique()->constrained('clients', 'person_id')->cascadeOnDelete();
            $table->text('training_goal')->nullable();             // цель тренировок
            $table->decimal('current_weight', 5, 2)->nullable();   // текущий вес
            $table->decimal('height', 5, 2)->nullable();           // рост
            $table->decimal('chest', 5, 2)->nullable();            // обхват груди
            $table->decimal('waist', 5, 2)->nullable();            // обхват талии
            $table->decimal('hips', 5, 2)->nullable();             // обхват бёдер
            $table->text('contraindications')->nullable();         // противопоказания
            $table->text('trainer_notes')->nullable();             // заметки тренера
            $table->date('last_measurement_date')->nullable();     // дата последнего замера
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_cards');
    }
};
