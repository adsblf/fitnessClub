<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Hall (зал) — залы фитнес-клуба.
 * Типы: gym, group, functional.
 */
class Hall extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'number',
        'type',
        'capacity',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function sessions()
    {
        return $this->hasMany(Session::class, 'hall_id');
    }
}
