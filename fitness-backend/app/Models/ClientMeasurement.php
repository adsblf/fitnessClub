<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель ClientMeasurement — один замер физических параметров клиента.
 */
class ClientMeasurement extends Model
{
    protected $table = 'client_measurements';

    protected $fillable = [
        'trainer_id',
        'client_id',
        'measured_at',
        'weight',
        'height',
        'chest',
        'waist',
        'hips',
        'body_fat',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'measured_at' => 'date',
            'weight'      => 'decimal:2',
            'height'      => 'decimal:2',
            'chest'       => 'decimal:2',
            'waist'       => 'decimal:2',
            'hips'        => 'decimal:2',
            'body_fat'    => 'decimal:2',
        ];
    }

    public function trainer()
    {
        return $this->belongsTo(Trainer::class, 'trainer_id', 'person_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id', 'person_id');
    }
}
