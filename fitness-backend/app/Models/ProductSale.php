<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель ProductSale — чек продажи.
 *
 * status: success | refund
 * total_amount: положительное для продаж, отрицательное для возвратов
 */
class ProductSale extends Model
{
    protected $fillable = [
        'administrator_id',
        'total_amount',
        'payment_method',
        'status',
        'is_refundable',
        'refund_of_id',
        'transaction_id',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'total_amount'  => 'decimal:2',
            'is_refundable' => 'boolean',
            'paid_at'       => 'datetime',
        ];
    }

    // ── Связи ──────────────────────────────────────────

    public function items()
    {
        return $this->hasMany(ProductSaleItem::class);
    }

    public function administrator()
    {
        return $this->belongsTo(Administrator::class, 'administrator_id', 'person_id');
    }

    public function originalSale()
    {
        return $this->belongsTo(ProductSale::class, 'refund_of_id');
    }

    public function refund()
    {
        return $this->hasOne(ProductSale::class, 'refund_of_id');
    }

    // ── Хелперы ────────────────────────────────────────

    public function isSale(): bool
    {
        return $this->status === 'success';
    }

    public function isRefund(): bool
    {
        return $this->status === 'refund';
    }

    /**
     * Можно ли оформить возврат по этому чеку.
     */
    public function canBeRefunded(): bool
    {
        return $this->isSale()
            && $this->is_refundable
            && $this->paid_at->gte(now()->subDays(14));
    }
}
