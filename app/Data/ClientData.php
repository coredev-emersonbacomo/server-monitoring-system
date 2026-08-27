<?php

namespace App\Data;

use App\Models\Client;
use Spatie\LaravelData\Data;

class ClientData extends Data
{
    public function __construct(
        public string $uuid,
        public string $name,
        public string $description,
        public string $location,
        public string $email,
        public string $contact_number,
        public string $banner_image_url,
        public int $servers_count,
        public int $servers_online_count,
        public int $secops_count,
        public string $created_at,
        public string $updated_at,
        public string $alert_scope = 'global',
        public string $record_status = 'active',
        public float $budget = 0.00,
        public float $total_subscription_fee = 0.00,
        public bool $is_assigned = false,
    ) {}

    public static function fromModel(Client $client, ?int $userId = null): self
    {
        $currentUserId = $userId ?? request()->user()?->id;
        $isAssigned = false;
        if ($currentUserId) {
            $isAssigned = $client->relationLoaded('secopclients')
                ? $client->secopclients->contains('id', $currentUserId)
                : $client->secopclients()->where('users.id', $currentUserId)->exists();
        }

        return new self(
            uuid: $client->uuid,
            name: $client->name,
            description: $client->description ?? '',
            location: $client->location,
            email: $client->email,
            contact_number: $client->contact_number,
            banner_image_url: $client->banner_image_url ?? '',
            servers_count: $client->servers_count,
            servers_online_count: $client->servers_online_count ?? 0,
            secops_count: $client->secopclients_count ?? $client->secopclients()->count(),
            created_at: $client->created_at->toIso8601String(),
            updated_at: $client->updated_at->toIso8601String(),
            alert_scope: $client->alert_scope ?? 'global',
            record_status: $client->record_status instanceof \UnitEnum ? $client->record_status->value : ($client->record_status ?? 'active'),
            budget: (float) ($client->budget ?? 0.00),
            total_subscription_fee: (float) ($client->total_subscription_fee ?? 0.00),
            is_assigned: $isAssigned,
        );
    }
}
