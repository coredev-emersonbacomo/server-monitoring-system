<?php

namespace App\Data;

use App\Models\User;
use Spatie\LaravelData\Data;

class SecopsUserData extends Data
{
    public function __construct(
        public int $id,
        public string $first_name,
        public string $last_name,
        public string $email,
        public string $username,
        public ?string $contact_number,
        public ?string $profile_picture_url,
    ) {}

    public static function fromModel(User $user): self
    {
        return new self(
            id: $user->id,
            first_name: $user->first_name,
            last_name: $user->last_name,
            email: $user->email,
            username: $user->username,
            contact_number: $user->contact_number,
            profile_picture_url: $user->profile_picture_url,
        );
    }
}
