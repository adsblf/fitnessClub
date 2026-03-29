<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель ClientCard (клиентская_карточка) — замеры и цели клиента.
 */
class ClientCard extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'client_id',
        'training_goal',
        'current_weight',
        'height',
        'chest',
        'waist',
        'hips',
        'contraindications',
        'trainer_notes',
        'last_measurement_date',
    ];

    protected function casts(): array
    {
        return [
            'current_weight' => 'decimal:2',
            'height' => 'decimal:2',
            'chest' => 'decimal:2',
            'waist' => 'decimal:2',
            'hips' => 'decimal:2',
            'last_measurement_date' => 'date',
        ];
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id', 'person_id');
    }

    /**
     * Рассчитать ИМТ (индекс массы тела).
     */
    public function getBmi(): ?float
    {
        if (!$this->current_weight || !$this->height) return null;
        $heightM = $this->height / 100;
        return round($this->current_weight / ($heightM * $heightM), 1);
    }
}
