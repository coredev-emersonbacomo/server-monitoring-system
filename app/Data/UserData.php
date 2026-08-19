<?php

namespace App\Data;

use App\Models\User;
use Illuminate\Support\Carbon;
use Spatie\LaravelData\Data;

class UserData extends Data
{
    public function __construct(
        public string $uuid,
        public string $first_name,
        public string $last_name,
        public string $email,
        public string $username,
        public string $phone_number,
        public ?string $last_login,
        public ?string $timezone,
        public string $profile_picture_url,
        public string $record_status,
        public Carbon $created_at,
        public Carbon $updated_at,
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
            last_login: $user->last_login,
            timezone: $user->timezone,
            profile_picture_url: $user->profile_picture_url,
            record_status: $user->record_status,
            created_at: $user->created_at,
            updated_at: $user->updated_at,
        );
    }
}
