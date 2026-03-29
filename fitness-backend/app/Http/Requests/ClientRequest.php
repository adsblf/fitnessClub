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
        $clientId = $this->route('id');

        // При обновлении — все поля необязательны
        if ($this->isMethod('put') || $this->isMethod('patch')) {
            return [
                'full_name'  => 'sometimes|string|max:150',
                'email'      => 'sometimes|email|unique:users,email,' . $this->getEmailOwnerId(),
                'phone'      => 'nullable|string|max:20',
                'birth_date' => 'nullable|date|before:today',
                'status'     => 'sometimes|in:active,inactive,blocked',
            ];
        }

        // При создании — email и ФИО обязательны
        return [
            'full_name'  => 'required|string|max:150',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'nullable|string|min:6',
            'phone'      => 'nullable|string|max:20',
            'birth_date' => 'nullable|date|before:today',
        ];
    }

    /**
     * Получить ID пользователя для проверки уникальности email при обновлении.
     */
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
            'full_name.required' => 'Укажите ФИО',
            'email.required'     => 'Укажите email',
            'email.unique'       => 'Этот email уже используется',
            'status.in'          => 'Статус должен быть: active, inactive или blocked',
        ];
    }
}
