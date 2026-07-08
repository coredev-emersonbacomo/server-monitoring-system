<?php

namespace App\Data;

use App\Models\User;
use Spatie\LaravelData\Data;

class SecopsUserData extends Data
{
    public function __construct(
        public string $uuid,
        public string $first_name,
        public string $last_name,
        public string $email,
        public string $username,
        public string $phone_number,
        public string $profile_picture_url,
    ) {}

    public static function fromModel(User $user): self
    {
        return new self(
            uuid: $user->uuid,
            first_name: $user->first_name,
            last_name: $user->last_name,
            email: $user->email,
            username: $user->username,
            phone_number: $user->phone_number,
            profile_picture_url: $user->profile_picture_url,
        );
    }
}
