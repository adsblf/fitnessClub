<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "trainer_client_cards" — карточка клиента, созданная конкретным тренером.
 * У одного клиента может быть несколько карточек (по одной от каждого тренера).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trainer_client_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trainer_id')->constrained('trainers', 'person_id')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients', 'person_id')->cascadeOnDelete();
            $table->text('training_goal')->nullable();
            $table->text('contraindications')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['trainer_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainer_client_cards');
    }
};
