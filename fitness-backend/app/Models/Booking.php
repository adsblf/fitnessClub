<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Booking (запись_на_занятие) — бронирование места.
 *
 * Статусы: booked, confirmed, cancelled, expired.
 */
class Booking extends Model
{
    protected $fillable = [
        'client_id',
        'session_id',
        'administrator_id',
        'status',
    ];

    // ── Связи ──────────────────────────────────────────

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id', 'person_id');
    }

    public function session()
    {
        return $this->belongsTo(Session::class);
    }

    public function administrator()
    {
        return $this->belongsTo(Administrator::class, 'administrator_id', 'person_id');
    }

    // ── Бизнес-логика ──────────────────────────────────

    public function confirm(): void
    {
        $this->update(['status' => 'confirmed']);
    }

    public function cancel(): void
    {
        $this->update(['status' => 'cancelled']);
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['booked', 'confirmed']);
    }
}
