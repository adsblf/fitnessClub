<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Таблица "payments" (оплата) — все платежи системы.
 * Связана с клиентом, абонементом, промокодом.
 * Способы оплаты: online_sbp / cash / card_terminal / bank_transfer.
 * Статусы: success / pending / cancelled / refund.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients', 'person_id')->cascadeOnDelete();
            $table->foreignId('membership_id')->nullable()->constrained('memberships')->nullOnDelete();
            $table->foreignId('promo_code_id')->nullable()->constrained('promo_codes')->nullOnDelete();
            $table->decimal('amount', 10, 2);                      // сумма
            $table->dateTime('paid_at');                           // дата оплаты
            $table->string('payment_method', 30);                  // способ оплаты
            $table->string('status', 20)->default('pending');      // статус
            $table->string('transaction_id', 100)->nullable();     // ID транзакции (от шлюза)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
