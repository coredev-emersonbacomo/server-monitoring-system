<?php

namespace App\Data;

use App\Models\User;
use Spatie\LaravelData\Data;
use Illuminate\Support\Carbon;

class FullUserData extends Data
{
    public function __construct(
        public int $id,
        public string $first_name,
        public string $last_name,
        public string $email,
        public int $role_id,
        public string $username,
        public string $contact_number,
        public ?string $last_login,
        public ?string $profile_picture_url,
        public ?string $profile_picture_public_id,
        public ?string $avatar,
        public string $status,
        public ?array $role,
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
            role_id: $user->role_id,
            username: $user->username,
            contact_number: $user->contact_number,
            last_login: $user->last_login,
            profile_picture_url: $user->profile_picture_url,
            profile_picture_public_id: $user->profile_picture_public_id,
            avatar: $user->profile_picture_url,
            status: 'active',
            role: $user->relationLoaded('role') && $user->role ? [
                'role_name' => $user->role->role_name,
            ] : null,
            created_at: $user->created_at,
            updated_at: $user->updated_at,
        );
    }
}
