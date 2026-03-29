<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель PersonalSession (персональное_занятие) — расширение Session.
 */
class PersonalSession extends Model
{
    protected $primaryKey = 'session_id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'session_id',
        'client_id',
    ];

    public function session()
    {
        return $this->belongsTo(Session::class, 'session_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id', 'person_id');
    }
}
