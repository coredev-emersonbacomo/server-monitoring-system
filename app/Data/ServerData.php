<?php

namespace App\Data;

use App\Models\Server;
use Spatie\LaravelData\Data;

class ServerData extends Data
{
    public function __construct(
        public string $server_name,

        public string $uuid,

        public string $external_ip,

        public string $device_name,

        public string $client_uuid,

        public string $client_name,

        public string $created_at,

        public string $updated_at,

        public ?int $cpu_cores = null,

        public ?int $ram = null,

        public ?string $operating_system = null,

        public ?string $status = null,

        /** @var StatPointData[] */
        public array $stats = [],
    ) {}

    public static function fromModel(Server $server): self
    {
        return new self(
            uuid: $server->uuid,
            client_uuid: $server->client->uuid,
            client_name: $server->client->name,
            server_name: $server->server_name,
            device_name: $server->device_name,
            external_ip: $server->external_ip,
            cpu_cores: $server->cpu_cores,
            ram: $server->ram,
            operating_system: $server->operating_system,
            created_at: $server->created_at->toIso8601String(),
            updated_at: $server->updated_at->toIso8601String(),
        );
    }
}
