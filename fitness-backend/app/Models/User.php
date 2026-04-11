<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Модель User (пользователь) — авторизация и личный кабинет.
 *
 * Связи:
 * - roles()  → many-to-many с Role через role_user
 * - person() → has-one Person (профиль)
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'email',
        'login',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // ── Связи ──────────────────────────────────────────

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    public function person()
    {
        return $this->hasOne(Person::class);
    }

    // ── Хелперы ────────────────────────────────────────

    /**
     * Проверить, есть ли у пользователя указанная роль.
     * Использование: $user->hasRole('admin')
     */
    public function hasRole(string $roleName): bool
    {
        return $this->roles()->where('name', $roleName)->exists();
    }
}
