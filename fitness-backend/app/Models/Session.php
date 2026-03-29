<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Session (занятие) — базовая модель для всех типов занятий.
 *
 * Поле type = 'group' или 'personal' — дискриминатор.
 * Связи groupSession() и personalSession() дают доступ к расширению.
 */
class Session extends Model
{
    protected $fillable = [
        'hall_id',
        'trainer_id',
        'starts_at',
        'ends_at',
        'status',
        'notes',
        'type',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    // ── Связи ──────────────────────────────────────────

    public function hall()
    {
        return $this->belongsTo(Hall::class);
    }

    public function trainer()
    {
        return $this->belongsTo(Trainer::class, 'trainer_id', 'person_id');
    }

    public function groupSession()
    {
        return $this->hasOne(GroupSession::class, 'session_id');
    }

    public function personalSession()
    {
        return $this->hasOne(PersonalSession::class, 'session_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'session_id');
    }

    public function visits()
    {
        return $this->hasMany(Visit::class, 'session_id');
    }

    // ── Хелперы ────────────────────────────────────────

    public function isGroup(): bool
    {
        return $this->type === 'group';
    }

    public function isPersonal(): bool
    {
        return $this->type === 'personal';
    }

    public function getDurationMinutes(): int
    {
        return (int) $this->starts_at->diffInMinutes($this->ends_at);
    }
}
