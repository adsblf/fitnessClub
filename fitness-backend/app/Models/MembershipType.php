<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель MembershipType (тип_абонемента) — шаблон абонемента.
 */
class MembershipType extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'name',
        'price',
        'visit_limit',
        'duration_days',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class, 'membership_type_id');
    }

    /**
     * Рассчитать цену с промокодом.
     * Если промокод ограничен по типам и данный тип не входит — скидка не применяется.
     */
    public function calculatePrice(?PromoCode $promo = null): float
    {
        $price = (float) $this->price;
        if (!$promo) return $price;
        if (!$promo->isValidForType($this->id)) return $price;

        if ($promo->discount_type === 'percent') {
            return round($price * (1 - $promo->discount_value / 100), 2);
        }
        return max(0, round($price - (float) $promo->discount_value, 2));
    }
}
