<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Модель TrainerClientCard — карточка клиента, созданная тренером.
 * Уникальна по паре (trainer_id, client_id).
 */
class TrainerClientCard extends Model
{
    protected $table = 'trainer_client_cards';

    protected $fillable = [
        'trainer_id',
        'client_id',
        'training_goal',
        'contraindications',
        'notes',
    ];

    public function trainer()
    {
        return $this->belongsTo(Trainer::class, 'trainer_id', 'person_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id', 'person_id');
    }
}
