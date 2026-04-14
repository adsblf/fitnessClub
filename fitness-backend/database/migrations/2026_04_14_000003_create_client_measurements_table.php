<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "client_measurements" — история замеров клиента, привязанная к тренеру.
 * Каждая запись — один замер: дата + физические параметры.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_measurements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trainer_id')->constrained('trainers', 'person_id')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients', 'person_id')->cascadeOnDelete();
            $table->date('measured_at');
            $table->decimal('weight', 5, 2)->nullable();   // кг
            $table->decimal('height', 5, 2)->nullable();   // см
            $table->decimal('chest', 5, 2)->nullable();    // см
            $table->decimal('waist', 5, 2)->nullable();    // см
            $table->decimal('hips', 5, 2)->nullable();     // см
            $table->decimal('body_fat', 5, 2)->nullable(); // % жира
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_measurements');
    }
};
