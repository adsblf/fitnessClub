<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id'  => 'required|exists:clients,person_id',
            'session_id' => 'nullable|exists:sessions,id',
            'visited_at' => 'nullable|date',
            'status'     => 'nullable|in:visited,no_show,late',
            'notes'      => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'client_id.required' => 'Укажите клиента',
            'client_id.exists'   => 'Клиент не найден',
            'status.in'          => 'Статус: visited, no_show или late',
        ];
    }
}
