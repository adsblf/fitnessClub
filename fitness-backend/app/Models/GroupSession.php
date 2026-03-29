<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель GroupSession (групповое_занятие) — расширение Session.
 */
class GroupSession extends Model
{
    protected $primaryKey = 'session_id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'session_id',
        'name',
        'difficulty_level',
        'max_participants',
    ];

    public function session()
    {
        return $this->belongsTo(Session::class, 'session_id');
    }

    /**
     * Сколько мест занято (подтверждённые + забронированные записи).
     */
    public function getRegisteredCount(): int
    {
        return $this->session->bookings()
            ->whereIn('status', ['booked', 'confirmed'])
            ->count();
    }

    /**
     * Сколько свободных мест.
     */
    public function getAvailableSlots(): int
    {
        return max(0, $this->max_participants - $this->getRegisteredCount());
    }

    public function isFull(): bool
    {
        return $this->getAvailableSlots() === 0;
    }
}
