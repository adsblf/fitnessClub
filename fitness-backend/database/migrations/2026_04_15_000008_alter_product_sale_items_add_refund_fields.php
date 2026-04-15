<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_sale_items', function (Blueprint $table) {
            // Сохраняем возвратность на момент продажи
            $table->boolean('is_returnable')->default(true)->after('unit_price');
            // Для частичных возвратов: ссылка на оригинальную позицию
            $table->unsignedBigInteger('original_item_id')->nullable()->after('is_returnable');
            $table->foreign('original_item_id')
                  ->references('id')
                  ->on('product_sale_items')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('product_sale_items', function (Blueprint $table) {
            $table->dropForeign(['original_item_id']);
            $table->dropColumn(['is_returnable', 'original_item_id']);
        });
    }
};
