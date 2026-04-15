<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Payment (оплата) — все платежи системы.
 *
 * payment_method: online_sbp / cash / card_terminal / bank_transfer
 * status: success / pending / cancelled / refund
 */
class Payment extends Model
{
    protected $fillable = [
        'client_id',
        'membership_id',
        'personal_session_id',
        'purpose',
        'promo_code_id',
        'amount',
        'paid_at',
        'payment_method',
        'status',
        'transaction_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    // ── Связи ──────────────────────────────────────────

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id', 'person_id');
    }

    public function membership()
    {
        return $this->belongsTo(Membership::class);
    }

    public function promoCode()
    {
        return $this->belongsTo(PromoCode::class);
    }

    // ── Хелперы ────────────────────────────────────────

    public function isSuccessful(): bool
    {
        return $this->status === 'success';
    }
}
