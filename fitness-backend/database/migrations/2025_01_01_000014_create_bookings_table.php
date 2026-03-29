<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "bookings" (запись_на_занятие) — бронирование места на занятие.
 * Связана с clients, sessions и administrators (кто подтвердил).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients', 'person_id')->cascadeOnDelete();
            $table->foreignId('session_id')->constrained('sessions')->cascadeOnDelete();
            $table->foreignId('administrator_id')->nullable()->constrained('administrators', 'person_id')->nullOnDelete();
            $table->string('status', 20)->default('booked');       // booked / confirmed / cancelled / expired
            $table->timestamps();                                  // created_at = дата_время_создания
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
