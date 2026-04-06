<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // PUT — всё необязательно
        if ($this->isMethod('put') || $this->isMethod('patch')) {
            return [
                'hall_id'          => 'sometimes|exists:halls,id',
                'trainer_id'       => 'sometimes|exists:trainers,person_id',
                'starts_at'        => 'sometimes|date',
                'ends_at'          => 'sometimes|date|after:starts_at',
                'notes'            => 'nullable|string',
                'name'             => 'sometimes|string|max:100',
                'difficulty_level' => 'nullable|string|max:50',
                'max_participants' => 'sometimes|integer|min:1',
            ];
        }

        // POST — создание
        $rules = [
            'type'       => 'required|in:group,personal',
            'hall_id'    => 'nullable|exists:halls,id',
            'trainer_id' => 'nullable|exists:trainers,person_id',
            'starts_at'  => 'required|date|after:now',
            'ends_at'    => 'required|date|after:starts_at',
            'notes'      => 'nullable|string',
        ];

        if ($this->input('type') === 'group') {
            $rules['name']             = 'required|string|max:100';
            $rules['difficulty_level'] = 'nullable|string|max:50';
            $rules['max_participants'] = 'required|integer|min:1|max:100';
        }

        if ($this->input('type') === 'personal') {
            $rules['client_id'] = 'required|exists:clients,person_id';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'type.required'      => 'Укажите тип занятия (group или personal)',
            'starts_at.required' => 'Укажите дату и время начала',
            'starts_at.after'    => 'Начало должно быть в будущем',
            'ends_at.after'      => 'Окончание должно быть позже начала',
            'name.required'      => 'Укажите название занятия',
            'max_participants.required' => 'Укажите максимум участников',
        ];
    }
}
