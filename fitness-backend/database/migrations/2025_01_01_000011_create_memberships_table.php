<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "memberships" (абонемент) — конкретный абонемент клиента.
 * Связана с clients, membership_types, administrators (кто оформил).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('memberships', function (Blueprint $table) {
            $table->id();
            $table->string('membership_number', 50)->unique();     // номер абонемента
            $table->foreignId('client_id')->constrained('clients', 'person_id')->cascadeOnDelete();
            $table->foreignId('membership_type_id')->constrained('membership_types');
            $table->foreignId('administrator_id')->nullable()->constrained('administrators', 'person_id')->nullOnDelete();
            $table->date('start_date');                            // дата начала
            $table->date('end_date');                              // дата окончания
            $table->integer('remaining_visits');                    // остаток посещений
            $table->date('frozen_until')->nullable();              // заморожен до
            $table->string('status', 20)->default('active');       // active / frozen / expired / cancelled
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memberships');
    }
};
