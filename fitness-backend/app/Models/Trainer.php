<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Trainer (тренер) — расширение Person для роли тренера.
 */
class Trainer extends Model
{
    protected $primaryKey = 'person_id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'person_id',
        'specialization',
        'contact_phone',
        'description',
    ];

    // ── Связи ──────────────────────────────────────────

    public function person()
    {
        return $this->belongsTo(Person::class, 'person_id');
    }

    public function sessions()
    {
        return $this->hasMany(Session::class, 'trainer_id', 'person_id');
    }
}
