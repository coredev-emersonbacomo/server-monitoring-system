<?php

namespace App\Data;

use App\Enums\UserRole;
use App\Models\User;
use Spatie\LaravelData\Data;
use Illuminate\Support\Carbon;

class UserData extends Data
{
    public function __construct(
        public int $id,
        public string $first_name,
        public string $last_name,
        public string $email,
        public string $username,
        public string $contact_number,
        public ?string $last_login,
        public string $profile_picture_url,
        public string $record_status,
        public ?Carbon $created_at,
        public ?Carbon $updated_at,
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
            last_login: $user->last_login,
            profile_picture_url: $user->profile_picture_url,
            record_status: $user->record_status,           
            created_at: $user->created_at,
            updated_at: $user->updated_at,
        );
    }
}
