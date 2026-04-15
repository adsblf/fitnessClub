<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Product — товар или услуга.
 *
 * category: accessories | food | services
 * is_returnable: false для food и services, true для accessories
 */
class Product extends Model
{
    protected $fillable = [
        'name',
        'category',
        'price',
        'stock_quantity',
        'is_returnable',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price'        => 'decimal:2',
            'is_returnable'=> 'boolean',
            'is_active'    => 'boolean',
        ];
    }

    // ── Связи ──────────────────────────────────────────

    public function saleItems()
    {
        return $this->hasMany(ProductSaleItem::class);
    }

    // ── Хелперы ────────────────────────────────────────

    public function isInStock(): bool
    {
        return $this->stock_quantity > 0;
    }

    /**
     * Категории, для которых возврат недоступен по умолчанию.
     */
    public static function nonReturnableCategories(): array
    {
        return ['food', 'services'];
    }

    /**
     * Вычислить is_returnable на основе категории.
     */
    public static function isReturnableForCategory(string $category): bool
    {
        return !in_array($category, self::nonReturnableCategories());
    }
}
