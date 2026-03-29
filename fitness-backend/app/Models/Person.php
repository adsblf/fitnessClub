<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

/**
 * Модель Person (человек) — профиль пользователя с ФИО и контактами.
 *
 * Связи:
 * - user()          → belongs-to User
 * - client()        → has-one Client
 * - trainer()       → has-one Trainer
 * - administrator() → has-one Administrator
 */
class Person extends Model
{
    protected $table = 'people';

    protected $fillable = [
        'user_id',
        'full_name',
        'phone',
        'birth_date',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
        ];
    }

    // ── Связи ──────────────────────────────────────────

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function client()
    {
        return $this->hasOne(Client::class, 'person_id');
    }

    public function trainer()
    {
        return $this->hasOne(Trainer::class, 'person_id');
    }

    public function administrator()
    {
        return $this->hasOne(Administrator::class, 'person_id');
    }

    // ── Хелперы ────────────────────────────────────────

    public function getAge(): ?int
    {
        return $this->birth_date ? $this->birth_date->age : null;
    }
}
