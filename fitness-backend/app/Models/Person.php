<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

/**
 * Модель Person (человек) — профиль пользователя с ФИО, контактами
 * и паспортными данными.
 */
class Person extends Model
{
    protected $table = 'people';

    protected $fillable = [
        'user_id',
        'full_name',
        'phone',
        'birth_date',
        'passport_series',
        'passport_number',
        'passport_issued_at',
        'passport_issued_by',
        'passport_department_code',
        'registration_address',
        'plain_password',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'passport_issued_at' => 'date',
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

    /**
     * Полностью ли заполнены паспортные данные.
     */
    public function hasPassport(): bool
    {
        return !empty($this->passport_series)
            && !empty($this->passport_number)
            && !empty($this->passport_issued_at)
            && !empty($this->passport_issued_by)
            && !empty($this->passport_department_code);
    }
}
