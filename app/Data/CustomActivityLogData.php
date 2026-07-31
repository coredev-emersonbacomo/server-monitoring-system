<?php

namespace App\Data;

use App\Models\CustomActivityLog;
use Spatie\LaravelData\Data;

class CustomActivityLogData extends Data
{
    public function __construct(
        public int $id,
        public ?string $type,
        public ?string $logable_type,
        public ?string $logable_id,
        public ?int $user_id,
        public ?string $user,
        public string $action,
        public mixed $details,
        public ?string $created_at,
        public ?string $updated_at,
    ) {}

    public static function fromModel(CustomActivityLog $log): self
    {
        return new self(
            id: $log->id,
            type: $log->type,
            logable_type: $log->logable_type,
            logable_id: (string) $log->logable_id,
            user_id: $log->user_id,
            user: $log->user,
            action: $log->action,
            details: $log->details,
            created_at: $log->created_at?->toISOString(),
            updated_at: $log->updated_at?->toISOString(),
        );
    }
}
