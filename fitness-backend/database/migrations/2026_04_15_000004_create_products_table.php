<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "products" — каталог товаров и услуг фитнес-клуба.
 *
 * category: accessories | food | services
 * - accessories: аксессуары (шейкеры, одежда, спортинвентарь)  — возврат доступен
 * - food:        питание (спортпит, коктейли, батончики, вода) — возврат НЕдоступен
 * - services:    услуги (массаж и пр.)                         — возврат НЕдоступен
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('category', 30);          // accessories | food | services
            $table->decimal('price', 10, 2);
            $table->integer('stock_quantity')->default(0);
            $table->boolean('is_returnable')->default(true); // false для food и services
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
