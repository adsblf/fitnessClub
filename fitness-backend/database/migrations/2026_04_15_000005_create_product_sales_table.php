<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "product_sales" — чеки продажи товаров/услуг.
 *
 * status: success | refund
 * - success: оплачено
 * - refund:  возврат (total_amount отрицательный, ссылается на оригинальный чек)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('administrator_id')
                ->nullable()
                ->constrained('administrators', 'person_id')
                ->nullOnDelete();
            $table->decimal('total_amount', 10, 2);        // отрицательное для возвратов
            $table->string('payment_method', 30);          // cash | card_terminal | online_sbp
            $table->string('status', 20)->default('success'); // success | refund
            $table->boolean('is_refundable')->default(true);  // false если в чеке есть еда/услуги
            $table->foreignId('refund_of_id')
                ->nullable()
                ->constrained('product_sales')
                ->nullOnDelete();
            $table->string('transaction_id', 100)->nullable();
            $table->dateTime('paid_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_sales');
    }
};
