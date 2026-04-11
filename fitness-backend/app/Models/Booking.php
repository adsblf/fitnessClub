<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Booking (запись_на_занятие) — бронирование места.
 *
 * Статусы:
 * - pending (ожидает подтверждения администратором)
 * - confirmed (подтверждено администратором, место зарезервировано)
 * - rejected (отклонено администратором)
 * - cancelled (отменено клиентом или истекло)
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

    /**
     * Подтвердить запись администратором.
     */
    public function approve(int $administratorId): void
    {
        $this->update([
            'status' => 'confirmed',
            'administrator_id' => $administratorId,
        ]);
    }

    /**
     * Отклонить запись администратором.
     */
    public function reject(int $administratorId): void
    {
        $this->update([
            'status' => 'rejected',
            'administrator_id' => $administratorId,
        ]);
    }

    /**
     * Отменить запись (по инициативе клиента или системе).
     */
    public function cancel(): void
    {
        $this->update(['status' => 'cancelled']);
    }

    /**
     * Активна ли запись (резервирует место на занятии).
     * Активными считаются только подтверждённые записи.
     */
    public function isActive(): bool
    {
        return $this->status === 'confirmed';
    }

    /**
     * Ожидает ли запись подтверждения админа.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Отклонена ли запись.
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }
}
