<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель ProductCategory — категория товаров.
 *
 * Владелец может создавать/редактировать/удалять категории.
 * is_returnable определяет, доступен ли возврат для товаров этой категории.
 */
class ProductCategory extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'is_returnable',
        'icon',
    ];

    protected function casts(): array
    {
        return [
            'is_returnable' => 'boolean',
        ];
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'category', 'slug');
    }
}
