<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "product_sale_items" — позиции чека.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_sale_id')
                ->constrained('product_sales')
                ->cascadeOnDelete();
            $table->foreignId('product_id')
                ->constrained('products')
                ->restrictOnDelete();
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2); // цена на момент продажи
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_sale_items');
    }
};
