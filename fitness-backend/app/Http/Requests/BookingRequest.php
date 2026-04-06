<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id'  => 'required|exists:clients,person_id',
            'session_id' => 'required|exists:sessions,id',
        ];
    }

    public function messages(): array
    {
        return [
            'client_id.required'  => 'Укажите клиента',
            'client_id.exists'    => 'Клиент не найден',
            'session_id.required' => 'Укажите занятие',
            'session_id.exists'   => 'Занятие не найдено',
        ];
    }
}
