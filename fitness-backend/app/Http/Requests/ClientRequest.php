<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Базовые правила для паспортных данных (необязательные)
        $passportRules = [
            'passport_series'           => 'nullable|string|regex:/^\d{4}$/',
            'passport_number'           => 'nullable|string|regex:/^\d{6}$/',
            'passport_issued_at'        => 'nullable|date|before_or_equal:today',
            'passport_issued_by'        => 'nullable|string|max:255',
            'passport_department_code'  => 'nullable|string|regex:/^\d{3}-\d{3}$/',
            'registration_address'      => 'nullable|string|max:255',
        ];

        // Телефон в формате +7-nnn-nnn-nnnn
        $phoneRule = 'nullable|string|regex:/^\+7-\d{3}-\d{3}-\d{4}$/';

        // При обновлении — все поля необязательны
        if ($this->isMethod('put') || $this->isMethod('patch')) {
            return array_merge([
                'full_name'  => 'sometimes|string|max:150',
                'email'      => 'sometimes|email|unique:users,email,' . $this->getEmailOwnerId(),
                'login'      => 'sometimes|string|unique:users,login,' . $this->getEmailOwnerId(),
                'phone'      => $phoneRule,
                'birth_date' => 'nullable|date|before:today',
                'status'     => 'sometimes|in:active,inactive,blocked',
            ], $passportRules);
        }

        // При создании — email и ФИО: email теперь обязателен для админа
        return array_merge([
            'full_name'  => 'required|string|max:150',
            'email'      => 'required|email|unique:users,email',
            'login'      => 'nullable|string|unique:users,login',
            'password'   => 'nullable|string|min:6',
            'phone'      => 'required|' . $phoneRule,
            'birth_date' => 'required|date|before:today',
        ], $passportRules);
    }

    private function getEmailOwnerId(): ?int
    {
        $clientId = $this->route('id');
        if (!$clientId) return null;

        $client = \App\Models\Client::with('person.user')->find($clientId);
        return $client?->person?->user?->id;
    }

    public function messages(): array
    {
        return [
            'full_name.required'                 => 'Укажите ФИО',
            'phone.required'                     => 'Укажите телефон',
            'phone.regex'                        => 'Телефон должен быть в формате +7-nnn-nnn-nnnn',
            'birth_date.required'                => 'Укажите дату рождения',
            'birth_date.date'                    => 'Неверный формат даты рождения',
            'birth_date.before'                  => 'Дата рождения должна быть раньше сегодняшней',
            'email.email'                        => 'Неверный формат email',
            'email.unique'                       => 'Этот email уже используется',
            'login.unique'                       => 'Этот логин уже используется',
            'passport_series.regex'              => 'Серия паспорта — ровно 4 цифры',
            'passport_number.regex'              => 'Номер паспорта — ровно 6 цифр',
            'passport_department_code.regex'    => 'Код подразделения — формат nnn-nnn',
            'passport_issued_at.before_or_equal' => 'Дата выдачи паспорта не может быть в будущем',
            'passport_issued_by.max'             => 'Слишком длинное значение поля "Кем выдан"',
            'status.in'                          => 'Статус должен быть: active, inactive или blocked',
        ];
    }
}
