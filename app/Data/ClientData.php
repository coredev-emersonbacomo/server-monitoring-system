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
        public string $created_at,
        public string $updated_at,
    ) {}

    public static function fromModel(Client $client): self
    {
        return new self(
            uuid: $client->uuid,
            name: $client->name,
            description: $client->description ?? '',
            location: $client->location ?? '',
            email: $client->email,
            contact_number: (string) ($client->contact_number ?? ''),
            banner_image_url: $client->banner_image_url,
            servers_count: $client->servers_count,
            created_at: $client->created_at?->toIso8601String() ?? '',
            updated_at: $client->updated_at?->toIso8601String() ?? '',
        );
    }
}
