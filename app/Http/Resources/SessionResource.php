<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $currentSessionUuid = $request->user()
            ? auth('jwt')->getSessionUuid()
            : null;

        return [
            'session_uuid' => $this->session_uuid,
            'device_name' => $this->device_name,
            'device_type' => $this->device_type,
            'browser' => $this->browser,
            'operating_system' => $this->operating_system,
            'ip_address' => $this->ip_address,
            'remember_me' => $this->remember_me,
            'last_activity_at' => $this->last_activity_at?->diffForHumans(),
            'last_activity_at_timestamp' => $this->last_activity_at?->toIso8601String(),
            'created_at' => $this->created_at?->diffForHumans(),
            'created_at_timestamp' => $this->created_at?->toIso8601String(),
            'current_session' => $this->session_uuid === $currentSessionUuid,
            'status' => $this->status()->value,
            'compromised' => $this->isCompromised(),
            'compromised_at' => $this->compromised_at?->diffForHumans(),
            'compromised_at_timestamp' => $this->compromised_at?->toIso8601String(),
            'compromise_reason' => $this->compromise_reason,
            'revoked_at' => $this->revoked_at?->diffForHumans(),
            'revoked_at_timestamp' => $this->revoked_at?->toIso8601String(),
        ];
    }
}
