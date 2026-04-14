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

    /**
     * Можно ли редактировать посещения этого занятия.
     * Редактировать можно во время или после начала занятия,
     * либо если занятие уже завершено (status = completed).
     */
    public function isEditable(): bool
    {
        return $this->status === 'completed' || now()->greaterThanOrEqualTo($this->starts_at);
    }

    /**
     * Получить информацию об участниках (записи + посещения).
     * Возвращает объединённый список с информацией о каждом участнике.
     */
    public function getParticipantsInfo()
    {
        $confirmedBookings = $this->bookings()
            ->where('status', 'confirmed')
            ->with(['client.person'])
            ->get();

        $visits = $this->visits()
            ->with(['client.person'])
            ->get();

        $participants = [];

        // Добавить записанных клиентов
        foreach ($confirmedBookings as $booking) {
            $clientId = $booking->client_id;
            if (!isset($participants[$clientId])) {
                $participants[$clientId] = [
                    'client_id' => $clientId,
                    'client_name' => $booking->client->person->full_name ?? 'Unknown',
                    'booking_id' => $booking->id,
                    'visit_id' => null,
                    'status' => 'confirmed',
                    'source' => 'booking',
                    'is_manual' => false,
                ];
            }
        }

        // Добавить/обновить посещения
        foreach ($visits as $visit) {
            $clientId = $visit->client_id;
            $participants[$clientId] = [
                'client_id' => $clientId,
                'client_name' => $visit->client->person->full_name ?? 'Unknown',
                'booking_id' => $participants[$clientId]['booking_id'] ?? null,
                'visit_id' => $visit->id,
                'status' => $visit->status,
                'source' => $visit->is_manual_entry ? 'manual' : 'visit',
                'is_manual' => $visit->is_manual_entry,
            ];
        }

        return array_values($participants);
    }
}
