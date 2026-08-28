<?php

namespace App\Data;

use App\Models\CustomActivityLog;
use Spatie\LaravelData\Data;

class ActivityLogData extends Data
{
    public function __construct(
        public int $id,
        public ?string $logable_type,
        public ?string $logable_id,
        public ?int $user_id,
        public ?string $user_uuid,
        public ?string $user,
        public string $action,
        public mixed $details,
        public ?string $created_at,
        public ?string $updated_at,
    ) {}

    public static function fromModel(CustomActivityLog $log): self
    {
        $subjectId = $log->logable_id;

        if ($log->logable_type && class_exists($log->logable_type)) {
            try {
                $subject = is_numeric($log->logable_id)
                    ? $log->logable_type::find($log->logable_id)
                    : $log->logable_type::where('uuid', $log->logable_id)->first();

                if ($subject && isset($subject->uuid)) {
                    $subjectId = $subject->uuid;
                }
            } catch (\Throwable $e) {
                // fall back to the stored identifier
            }
        }

        return new self(
            id: $log->id,
            logable_type: $log->logable_type,
            logable_id: $subjectId === null ? null : (string) $subjectId,
            user_id: $log->user_id,
            user_uuid: $log->PerformerUser?->uuid,
            user: $log->user,
            action: $log->action,
            details: $log->details,
            created_at: $log->created_at?->toIso8601String(),
            updated_at: $log->updated_at?->toIso8601String(),
        );
    }
}
