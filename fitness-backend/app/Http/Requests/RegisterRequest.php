<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:6',
            'full_name'  => 'required|string|max:150',
            'phone'      => 'nullable|string|max:20',
            'birth_date' => 'nullable|date|before:today',
        ];
    }

    public function messages(): array
    {
        return [
            'email.required'    => 'Укажите email',
            'email.unique'      => 'Этот email уже зарегистрирован',
            'password.required' => 'Укажите пароль',
            'password.min'      => 'Пароль должен быть не менее 6 символов',
            'full_name.required' => 'Укажите ФИО',
        ];
    }
}
