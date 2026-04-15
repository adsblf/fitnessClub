<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Client (клиент) — расширение Person для роли клиента.
 *
 * Важно: primary key = person_id (не автоинкремент).
 *
 * Связи:
 * - person()      → belongs-to Person
 * - card()        → has-one ClientCard
 * - memberships() → has-many Membership
 * - bookings()    → has-many Booking
 * - visits()      → has-many Visit
 * - payments()    → has-many Payment
 */
class Client extends Model
{
    protected $primaryKey = 'person_id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'person_id',
        'registration_date',
        'status',
        'balance',
    ];

    protected function casts(): array
    {
        return [
            'registration_date' => 'date',
            'balance'           => 'decimal:2',
        ];
    }

    // ── Связи ──────────────────────────────────────────

    public function person()
    {
        return $this->belongsTo(Person::class, 'person_id');
    }

    public function card()
    {
        return $this->hasOne(ClientCard::class, 'client_id', 'person_id');
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class, 'client_id', 'person_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'client_id', 'person_id');
    }

    public function visits()
    {
        return $this->hasMany(Visit::class, 'client_id', 'person_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'client_id', 'person_id');
    }

    public function trainers()
    {
        return $this->belongsToMany(
            Trainer::class,
            'trainer_clients',
            'client_id',
            'trainer_id',
            'person_id',
            'person_id'
        )->withPivot('attached_at');
    }

    // ── Хелперы ────────────────────────────────────────

    /**
     * Получить активный абонемент клиента (если есть).
     */
    public function getActiveMembership(): ?Membership
    {
        return $this->memberships()->where('status', 'active')->latest()->first();
    }

    public function getRemainingVisits(): int
    {
        $membership = $this->getActiveMembership();
        return $membership ? $membership->remaining_visits : 0;
    }
}
