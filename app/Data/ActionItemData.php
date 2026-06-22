<?php

namespace App\Data;

use App\Models\ActionItem;
use Spatie\LaravelData\Data;

class ActionItemData extends Data
{
    public function __construct(
        public int $id,
        public string $action_type,
        public string $message,
        public string $severity,
        public ?int $server_id,
        public ?int $client_id,
        public ?string $client_name,
        public ?string $server_name,
        public ?int $assigned_to,
        public ?string $assigned_to_name,
        public string $status,
    ) {}

    public static function fromModel(ActionItem $action): self
    {
        return new self(
            id: $action->id,
            action_type: $action->action_type,
            message: $action->message,
            severity: $action->severity,
            server_id: $action->server_id,
            client_id: $action->client_id,
            client_name: $action->client_name,
            server_name: $action->server_name,
            assigned_to: $action->assigned_to,
            assigned_to_name: $action->relationLoaded('assignedUser') && $action->assignedUser
                ? $action->assignedUser->first_name . ' ' . $action->assignedUser->last_name
                : null,
            status: $action->status,
        );
    }
}
