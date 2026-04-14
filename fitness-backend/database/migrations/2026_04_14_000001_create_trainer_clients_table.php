<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "trainer_clients" — связь тренер ↔ клиент (many-to-many).
 * Один клиент может быть закреплён за несколькими тренерами.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trainer_clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trainer_id')->constrained('trainers', 'person_id')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients', 'person_id')->cascadeOnDelete();
            $table->timestamp('attached_at')->useCurrent();

            $table->unique(['trainer_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainer_clients');
    }
};
