<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Модель Membership (абонемент) — конкретный абонемент клиента.
 *
 * Статусы: active, frozen, expired, cancelled.
 */
class Membership extends Model
{
    protected $fillable = [
        'membership_number',
        'client_id',
        'membership_type_id',
        'administrator_id',
        'start_date',
        'end_date',
        'remaining_visits',
        'frozen_until',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'frozen_until' => 'date',
        ];
    }

    // ── Связи ──────────────────────────────────────────

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id', 'person_id');
    }

    public function membershipType()
    {
        return $this->belongsTo(MembershipType::class);
    }

    public function administrator()
    {
        return $this->belongsTo(Administrator::class, 'administrator_id', 'person_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function visits()
    {
        return $this->hasMany(Visit::class);
    }

    // ── Бизнес-логика ──────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->end_date->isFuture();
    }

    public function isExpired(): bool
    {
        return $this->end_date->isPast();
    }

    /**
     * Списать одно посещение. Возвращает true если успешно.
     */
    public function deductVisit(): bool
    {
        if ($this->remaining_visits <= 0 || !$this->isActive()) {
            return false;
        }
        $this->decrement('remaining_visits');
        return true;
    }

    /**
     * Заморозить абонемент до указанной даты.
     */
    public function freeze(\DateTimeInterface $until): void
    {
        $this->update([
            'status' => 'frozen',
            'frozen_until' => $until,
        ]);
    }

    /**
     * Разморозить абонемент.
     */
    public function unfreeze(): void
    {
        $this->update([
            'status' => 'active',
            'frozen_until' => null,
        ]);
    }

    /**
     * Сгенерировать уникальный номер абонемента.
     */
    public static function generateNumber(): string
    {
        return 'MBR-' . strtoupper(Str::random(8));
    }
}
