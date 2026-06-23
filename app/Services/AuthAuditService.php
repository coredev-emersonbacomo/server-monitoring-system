<?php

namespace App\Services;

use App\Enums\AuthEventType;
use App\Models\AuthAuditLog;

class AuthAuditService
{
    public function log(
        string|AuthEventType $eventType,
        ?int $userId = null,
        ?string $sessionUuid = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?array $metadata = null,
    ): AuthAuditLog {
        if ($eventType instanceof AuthEventType) {
            $eventType = $eventType->value;
        }

        return AuthAuditLog::create([
            'user_id' => $userId,
            'session_uuid' => $sessionUuid,
            'event_type' => $eventType,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'metadata' => $metadata,
        ]);
    }
}
