<?php

namespace App\Http\Requests;

use App\Enums\UploadPurpose;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StoreUploadIntentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'purpose' => ['required', 'string', new Enum(UploadPurpose::class)],
        ];
    }

    public function purpose(): UploadPurpose
    {
        return UploadPurpose::from($this->validated('purpose'));
    }
}
