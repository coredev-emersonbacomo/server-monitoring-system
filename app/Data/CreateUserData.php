<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Confirmed;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Nullable;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\Unique;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Support\Validation\ValidationContext;

class CreateUserData extends Data
{
    public function __construct(
        #[Required, Max(64)]
        public string $first_name,

        #[Required, Max(255)]
        public string $last_name,

        #[Required, Email, Max(255), Unique('users', 'email')]
        public string $email,

        #[Required, Min(11), Max(255), Unique('users', 'phone_number')]
        public string $phone_number,

        #[Required, Max(255), Unique('users', 'username')]
        public string $username,

        #[Required, Min(8), Confirmed]
        public string $password,

        public string $password_confirmation,

        public ?string $upload_intent_id = null,

        public ?string $profile_picture_storage_key = null,

        #[Nullable, Max(255)]
        public ?string $timezone = null,
    ) {}

    public static function rules(?ValidationContext $context = null): array
    {
        return [
            'first_name' => ['required', 'string', 'max:64'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone_number' => ['required', 'string', 'min:11', 'max:255', 'unique:users,phone_number'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'timezone' => ['nullable', 'string', 'max:255', 'timezone'],
        ];
    }
}
