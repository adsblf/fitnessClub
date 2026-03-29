<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "administrators" (администратор) — расширение профиля.
 * PK = person_id (FK на people). Связь 1:1.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('administrators', function (Blueprint $table) {
            $table->foreignId('person_id')->primary()->constrained('people')->cascadeOnDelete();
            $table->string('position', 50)->nullable();            // должность
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('administrators');
    }
};
