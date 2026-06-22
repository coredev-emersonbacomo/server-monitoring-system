<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Confirmed;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Nullable;
use Spatie\LaravelData\Attributes\Validation\Sometimes;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

class UpdateUserData extends Data
{
    public function __construct(
        #[Sometimes, Max(255)]
        public string|Optional $first_name,

        #[Sometimes, Max(255)]
        public string|Optional $last_name,

        #[Sometimes, Email, Max(255)]
        public string|Optional $email,

        #[Required, Min(11), Max(255), Unique('users', 'contact_number')]
        public string $contact_number,

        #[Sometimes, Max(255)]
        public string|Optional $username,

        #[Sometimes]
        public int|Optional $role_id,

        #[Sometimes, Nullable, Min(8), Confirmed]
        public string|Optional|null $password,

        public string|Optional|null $password_confirmation,

        public string|Optional|null $cloudinary_url,

        public string|Optional|null $cloudinary_public_id,
    ) {}
}
