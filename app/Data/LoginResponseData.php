<?php

namespace App\Data;

use App\Models\UserSession;
use Spatie\LaravelData\Data;

class LoginResponseData extends Data
{
    public function __construct(
        public string $access_token,
        public int $expires_in,
        public AuthUserData $user,
        public array $session,
    ) {}

    public static function fromAuth(
        string $accessToken,
        int $expiresIn,
        AuthUserData $user,
        UserSession $session,
    ): self {
        return new self(
            access_token: $accessToken,
            expires_in: $expiresIn,
            user: $user,
            session: [
                'session_uuid' => $session->session_uuid,
                'device_name' => $session->device_name,
                'device_type' => $session->device_type,
                'browser' => $session->browser,
                'operating_system' => $session->operating_system,
                'remember_me' => $session->remember_me,
                'created_at' => $session->created_at?->toIso8601String(),
            ],
        );
    }
}
