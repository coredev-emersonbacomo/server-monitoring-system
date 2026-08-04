<?php

namespace App\Data;

use Illuminate\Validation\Rule;
use Spatie\LaravelData\Attributes\Validation\Confirmed;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Nullable;
use Spatie\LaravelData\Attributes\Validation\Sometimes;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\LaravelData\Support\Validation\ValidationContext;

class UpdateUserData extends Data
{
    public function __construct(
        #[Sometimes, Max(255)]
        public string|Optional $first_name,

        #[Sometimes, Max(255)]
        public string|Optional $last_name,

        #[Sometimes, Email, Max(255)]
        public string|Optional $email,

        #[Required, Min(11)]
        public string $phone_number,

        #[Sometimes, Max(255)]
        public string|Optional $username,

        #[Sometimes, Nullable, Max(255)]
        public string|Optional|null $timezone,

        #[Sometimes, Nullable, Min(8), Confirmed]
        public string|Optional|null $password,

        public string|Optional|null $password_confirmation,

        public string|Optional|null $upload_intent_id,

        public string|Optional|null $profile_picture_storage_key,
    ) {}

    public static function rules(ValidationContext|null $context = null): array
    {
        $user = request()->route('user');
        $userId = $user instanceof \App\Models\User ? $user->id : $user;

        return [
            'phone_number' => [
                'required',
                'string',
                'min:11',
                Rule::unique('users', 'phone_number')->ignore($userId),
            ],
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'username' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('users', 'username')->ignore($userId),
            ],
            'timezone' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
                'timezone',
            ],
        ];
    }
}
