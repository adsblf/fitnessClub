<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель Administrator (администратор) — расширение Person.
 */
class Administrator extends Model
{
    protected $primaryKey = 'person_id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'person_id',
        'position',
    ];

    public function person()
    {
        return $this->belongsTo(Person::class, 'person_id');
    }
}
