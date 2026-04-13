<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "promo_code_membership_type" — ограничение промокодов по типам абонементов.
 * Если строк нет для данного промокода — он действует на все типы.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_code_membership_type', function (Blueprint $table) {
            $table->foreignId('promo_code_id')->constrained('promo_codes')->cascadeOnDelete();
            $table->foreignId('membership_type_id')->constrained('membership_types')->cascadeOnDelete();
            $table->primary(['promo_code_id', 'membership_type_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_code_membership_type');
    }
};
