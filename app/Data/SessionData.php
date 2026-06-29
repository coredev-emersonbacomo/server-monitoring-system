<?php

namespace App\Data;

use App\Models\UserSession;
use Spatie\LaravelData\Data;

class SessionData extends Data
{
    public function __construct(
        public string $session_uuid,
        public ?string $device_name,
        public ?string $device_type,
        public ?string $browser,
        public ?string $operating_system,
        public ?string $ip_address,
        public bool $remember_me,
        public ?string $last_activity_at,
        public ?string $last_activity_at_timestamp,
        public ?string $created_at,
        public ?string $created_at_timestamp,
        public bool $current_session,
        public string $status,
        public bool $compromised,
        public ?string $compromised_at,
        public ?string $compromised_at_timestamp,
        public ?string $compromise_reason,
        public ?string $revoked_at,
        public ?string $revoked_at_timestamp,
    ) {}

    public static function fromModel(UserSession $session, ?string $currentSessionUuid): self
    {
        return new self(
            session_uuid: $session->session_uuid,
            device_name: $session->device_name,
            device_type: $session->device_type,
            browser: $session->browser,
            operating_system: $session->operating_system,
            ip_address: $session->ip_address,
            remember_me: $session->remember_me,
            last_activity_at: $session->last_activity_at?->diffForHumans(),
            last_activity_at_timestamp: $session->last_activity_at?->toIso8601String(),
            created_at: $session->created_at?->diffForHumans(),
            created_at_timestamp: $session->created_at?->toIso8601String(),
            current_session: $session->session_uuid === $currentSessionUuid,
            status: $session->status()->value,
            compromised: $session->isCompromised(),
            compromised_at: $session->compromised_at?->diffForHumans(),
            compromised_at_timestamp: $session->compromised_at?->toIso8601String(),
            compromise_reason: $session->compromise_reason,
            revoked_at: $session->revoked_at?->diffForHumans(),
            revoked_at_timestamp: $session->revoked_at?->toIso8601String(),
        );
    }
}
