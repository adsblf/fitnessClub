<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Добавляем поддержку продажи товаров через эквайринг в таблицу payments:
 *   - client_id → nullable (продажа товаров не требует привязки к клиенту)
 *   - product_sale_id → nullable FK на product_sales
 */
return new class extends Migration
{
    public function up(): void
    {
        // Снимаем ограничение NOT NULL с client_id (FK ограничение остаётся)
        DB::statement('ALTER TABLE payments ALTER COLUMN client_id DROP NOT NULL');

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('product_sale_id')
                ->nullable()
                ->after('membership_id')
                ->constrained('product_sales')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['product_sale_id']);
            $table->dropColumn('product_sale_id');
        });

        DB::statement('ALTER TABLE payments ALTER COLUMN client_id SET NOT NULL');
    }
};
