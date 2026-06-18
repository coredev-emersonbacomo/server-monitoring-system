<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Unique;
use Symfony\Contracts\Service\Attribute\Required;

class UserData extends Data
{
    public function __construct(
        #[Required]
        public int $id,
        #[Required, Min(2)]
        public string $first_name,
        #[Required, Min(2)]
        public string $last_name,
        #[Required]
        public string $contact_number,
        #[Required]
        public int $role_id,
        public string $profile_picture_url,
        #[Email, Unique("users", "email")]
        public string $email,
        #[Min(3), Unique('users', 'username')]
        public string $username,
        #[Min(8)]
        public string $password,
    ) {
    }
}
