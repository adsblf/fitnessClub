<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель PromoCode (промокод) — скидочные коды.
 *
 * discount_type: percent / fixed
 */
class PromoCode extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'code',
        'discount_type',
        'discount_value',
        'starts_at',
        'ends_at',
        'max_uses',
        'used_count',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'decimal:2',
            'starts_at' => 'date',
            'ends_at' => 'date',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Проверить, действителен ли промокод сейчас.
     */
    public function isValid(): bool
    {
        return $this->is_active
            && now()->between($this->starts_at, $this->ends_at)
            && $this->used_count < $this->max_uses;
    }

    /**
     * Проверить, действителен ли промокод для конкретного типа абонемента.
     * Если ограничений нет — действует на все типы.
     */
    public function isValidForType(int $membershipTypeId): bool
    {
        if (!$this->isValid()) return false;
        $restricted = $this->membershipTypes()->exists();
        if (!$restricted) return true;
        return $this->membershipTypes()->where('membership_types.id', $membershipTypeId)->exists();
    }

    /**
     * Использовать промокод (увеличить счётчик).
     */
    public function markUsed(): void
    {
        $this->increment('used_count');
    }

    // ── Связи ──────────────────────────────────────────

    public function membershipTypes()
    {
        return $this->belongsToMany(MembershipType::class, 'promo_code_membership_type');
    }
}
