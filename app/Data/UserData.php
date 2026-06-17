<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Unique;


class UserData extends Data
{
    public function __construct(
        public int $id,
        public string $first_name,
        public string $last_name,
        public int $role_id,
        public string $profile_picture_url,
        #[Email]
        public string $email,
        #[Min(3), Unique('users', 'username')]
        public string $username,
        #[Min(8)]
        public string $password,
    ) {
    }
}
