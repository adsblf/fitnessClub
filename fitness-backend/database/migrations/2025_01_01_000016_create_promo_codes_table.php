<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "promo_codes" (промокод) — скидочные коды.
 * Типы скидки: percent (процентная), fixed (фиксированная).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();                  // уникальный код
            $table->string('discount_type', 20);                   // percent / fixed
            $table->decimal('discount_value', 10, 2);              // значение скидки
            $table->date('starts_at');                             // дата начала действия
            $table->date('ends_at');                               // дата окончания
            $table->integer('max_uses');                            // максимум использований
            $table->integer('used_count')->default(0);             // сколько раз использован
            $table->boolean('is_active')->default(true);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_codes');
    }
};
