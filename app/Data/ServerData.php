<?php

namespace App\Data;

use App\Models\Server;
use Spatie\LaravelData\Data;
use Illuminate\Support\Facades\Crypt;

class ServerData extends Data
{
    public function __construct(
        public string $server_name,

        public string $uuid,

        public string $external_ip,

<<<<<<< Updated upstream
        public string $device_name,

        public ?int $ssh_port = null,
=======
        public ?int $ssh_port = null,

        public string $device_name,
>>>>>>> Stashed changes

        public ?string $ssh_username = null,

        public ?int $cpu_cores = null,

        public ?int $ram = null,

        public ?string $operating_system = null,

        public ?int $client_id = null,

        public ?string $client_uuid = null,

        public ?string $client_name = null,

        public ?string $last_seen = null,

        public ?string $status = null,

        public ?string $created_at = null,

        public ?string $updated_at = null,

        /** @var StatPointData[] */
        public array $stats = [],
    ) {}

    public static function fromModel(Server $server): self
    {
        return new self(
            uuid: $server->uuid,
            client_id: $server->client_id,
            client_uuid: $server->client->uuid,
            server_name: $server->server_name,
            device_name: $server->device_name,
            external_ip: $server->external_ip,
            ssh_port: $server->ssh_port,
            ssh_username: $server->ssh_username ? Crypt::decryptString($server->ssh_username) : null,
            cpu_cores: $server->cpu_cores,
            ram: $server->ram,
            operating_system: $server->operating_system,
            created_at: $server->created_at?->toIso8601String() ?? '',
            updated_at: $server->updated_at?->toIso8601String() ?? '',
        );
    }
}
