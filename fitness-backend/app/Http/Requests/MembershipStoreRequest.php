<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MembershipStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id'          => 'required|exists:clients,person_id',
            'membership_type_id' => 'required|exists:membership_types,id',
            'payment_method'     => 'required|in:online_sbp,cash,card_terminal,bank_transfer',
            'promo_code'         => 'nullable|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'client_id.required'          => 'Укажите клиента',
            'client_id.exists'            => 'Клиент не найден',
            'membership_type_id.required' => 'Укажите тип абонемента',
            'membership_type_id.exists'   => 'Тип абонемента не найден',
            'payment_method.required'     => 'Укажите способ оплаты',
            'payment_method.in'           => 'Недопустимый способ оплаты',
        ];
    }
}
