<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "visits" (посещение) — факт посещения занятия клиентом.
 * При создании посещения списывается визит с абонемента.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients', 'person_id')->cascadeOnDelete();
            $table->foreignId('session_id')->nullable()->constrained('sessions')->nullOnDelete();
            $table->foreignId('administrator_id')->nullable()->constrained('administrators', 'person_id')->nullOnDelete();
            $table->foreignId('membership_id')->nullable()->constrained('memberships')->nullOnDelete();
            $table->dateTime('visited_at');                        // дата/время посещения
            $table->string('status', 30)->default('visited');      // visited / no_show / late
            $table->text('notes')->nullable();                     // примечание
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
