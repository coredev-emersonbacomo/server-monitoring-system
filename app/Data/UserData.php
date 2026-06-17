<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Data;

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
    ) {
    }
}
