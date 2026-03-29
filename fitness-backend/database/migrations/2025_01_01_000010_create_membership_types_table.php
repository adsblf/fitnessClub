<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "membership_types" (тип_абонемента) — шаблоны абонементов.
 * Например: "Стандарт 1 мес.", "Премиум 12 мес." и т.д.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('membership_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);                           // название
            $table->decimal('price', 10, 2);                       // цена
            $table->integer('visit_limit');                         // количество посещений
            $table->integer('duration_days');                       // срок действия в днях
            $table->text('description')->nullable();               // описание
            $table->boolean('is_active')->default(true);           // активен ли тип
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('membership_types');
    }
};
