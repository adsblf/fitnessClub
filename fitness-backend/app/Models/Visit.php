<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Visit (посещение) — факт посещения клиентом занятия.
 *
 * Статусы: visited, no_show, late.
 */
class Visit extends Model
{
    protected $fillable = [
        'client_id',
        'session_id',
        'administrator_id',
        'membership_id',
        'visited_at',
        'status',
        'notes',
        'is_manual_entry',
    ];

    protected function casts(): array
    {
        return [
            'visited_at' => 'datetime',
        ];
    }

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

    public function membership()
    {
        return $this->belongsTo(Membership::class);
    }
}
