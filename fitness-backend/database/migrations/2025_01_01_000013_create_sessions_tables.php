<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "sessions" (занятие) — базовая таблица занятий.
 * Наследники: group_sessions и personal_sessions.
 * Связана с halls (где проводится) и trainers (кто ведёт).
 *
 * Также создаёт таблицы group_sessions и personal_sessions.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Базовая таблица занятий
        Schema::create('sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hall_id')->nullable()->constrained('halls')->nullOnDelete();
            $table->foreignId('trainer_id')->nullable()->constrained('trainers', 'person_id')->nullOnDelete();
            $table->dateTime('starts_at');                         // дата/время начала
            $table->dateTime('ends_at');                           // дата/время окончания
            $table->string('status', 20)->default('scheduled');    // scheduled / in_progress / completed / cancelled
            $table->text('notes')->nullable();                     // примечание
            $table->string('type', 20);                            // 'group' или 'personal' — дискриминатор
            $table->timestamps();
        });

        // Групповое занятие — расширение sessions
        Schema::create('group_sessions', function (Blueprint $table) {
            $table->foreignId('session_id')->primary()->constrained('sessions')->cascadeOnDelete();
            $table->string('name', 100);                           // название (Кроссфит, Йога...)
            $table->string('difficulty_level', 50)->nullable();    // уровень сложности
            $table->integer('max_participants');                    // максимум участников
        });

        // Персональное занятие — расширение sessions
        Schema::create('personal_sessions', function (Blueprint $table) {
            $table->foreignId('session_id')->primary()->constrained('sessions')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients', 'person_id')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_sessions');
        Schema::dropIfExists('group_sessions');
        Schema::dropIfExists('sessions');
    }
};
