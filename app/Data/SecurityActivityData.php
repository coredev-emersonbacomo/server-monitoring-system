<?php

namespace App\Data;

use App\Models\AuthAuditLog;
use Spatie\LaravelData\Data;

class SecurityActivityData extends Data
{
    public function __construct(
        public int $id,
        public string $event_type,
        public ?string $ip_address,
        public ?string $created_at,
        public ?string $created_at_timestamp,
        public mixed $metadata,
    ) {}

    public static function fromModel(AuthAuditLog $log): self
    {
        return new self(
            id: $log->id,
            event_type: $log->event_type,
            ip_address: $log->ip_address,
            created_at: $log->created_at?->diffForHumans(),
            created_at_timestamp: $log->created_at?->toIso8601String(),
            metadata: $log->metadata,
        );
    }
}
