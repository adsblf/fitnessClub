<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель ProductSaleItem — позиция в чеке продажи.
 */
class ProductSaleItem extends Model
{
    protected $fillable = [
        'product_sale_id',
        'product_id',
        'quantity',
        'unit_price',
        'is_returnable',
        'original_item_id',
    ];

    protected function casts(): array
    {
        return [
            'unit_price'     => 'decimal:2',
            'is_returnable'  => 'boolean',
        ];
    }

    // ── Связи ──────────────────────────────────────────

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function sale()
    {
        return $this->belongsTo(ProductSale::class, 'product_sale_id');
    }
}
