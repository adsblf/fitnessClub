<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Конвертируем пустые строки в null до валидации,
     * чтобы PostgreSQL не получал пустую строку вместо bigint.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'hall_id'    => $this->hall_id    ?: null,
            'trainer_id' => $this->trainer_id ?: null,
            'client_id'  => $this->client_id  ?: null,
        ]);
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
                'client_id'        => 'sometimes|exists:clients,person_id',
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
            $rules['client_id']       = 'required|exists:clients,person_id';
            $rules['payment_method']  = 'nullable|in:balance,cash,card_terminal,online_sbp';
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
