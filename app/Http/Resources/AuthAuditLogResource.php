<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthAuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'event_type' => $this->event_type,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->diffForHumans(),
            'created_at_timestamp' => $this->created_at?->toIso8601String(),
        ];
    }
}
