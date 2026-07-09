<?php

namespace App\Data;

use App\Models\Server;
use Spatie\LaravelData\Data;

class ServerData extends Data
{
    public function __construct(
        public string $server_name,

        public string $uuid,

        public ?string $external_ip,

        public string $host_name,
        
        public ?int $ssh_port,

        public ?string $ssh_username,

        public string $client_uuid,

        public string $client_name,

        public string $created_at,

        public string $updated_at,

        public string $record_status,

        public ?int $cpu_cores = null,

        public ?string $ram = null,

        public ?string $disk = null,
        
        public ?string $cpu_model = null,

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
            host_name: $server->host_name,
            external_ip: $server->external_ip,
            ssh_port: $server->ssh_port,
            ssh_username: $server->ssh_username,
            cpu_model: $server->cpu_model,
            cpu_cores: $server->cpu_cores,
            ram: $server->ram,
            disk: $server->disk,
            operating_system: $server->operating_system,
            record_status: $server->record_status?->value ?? 'active',
            status: $server->status,
            created_at: $server->created_at->toIso8601String(),
            updated_at: $server->updated_at->toIso8601String(),
        );
    }
}
