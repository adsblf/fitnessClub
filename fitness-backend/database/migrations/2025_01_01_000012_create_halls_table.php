<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "halls" (зал) — залы фитнес-клуба.
 * Типы: gym (тренажёрный), group (групповых занятий), functional (функциональный).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('halls', function (Blueprint $table) {
            $table->id();
            $table->string('number', 50);                          // номер зала
            $table->string('type', 50);                            // тип зала (enum в коде)
            $table->integer('capacity');                            // вместимость
            $table->boolean('is_active')->default(true);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('halls');
    }
};
