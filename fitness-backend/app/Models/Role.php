<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Role (роль) — справочник ролей.
 * Значения: client, trainer, admin, owner.
 */
class Role extends Model
{
    public $timestamps = false;

    protected $fillable = ['name', 'description'];

    public function users()
    {
        return $this->belongsToMany(User::class, 'role_user');
    }
}
