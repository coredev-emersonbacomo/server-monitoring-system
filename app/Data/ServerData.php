<?php

namespace App\Data;

use App\Models\Server;
use Spatie\LaravelData\Data;

class ServerData extends Data
{
    public function __construct(
        public string $name,

        public string $uuid,

        public string $host_name,

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

        /** @var array{token: string, expires_at: string, linux_command: string, windows_command: string}|null */
        public ?array $activeProvisionDetails = null,
    ) {}

    public static function fromModel(Server $server): self
    {
        $activeDetails = null;
        if (in_array($server->status, ['pending_installation', 'waiting_for_installation'])) {
            $activeToken = $server->activeProvisionToken;
            if ($activeToken && !$activeToken->isExpired()) {
                $token = $activeToken->token;
                $activeDetails = [
                    'token' => $token,
                    'expires_at' => $activeToken->expires_at->copy()->utc()->toIso8601String(),
                    'linux_command' => 'curl -fsSL ' . url('/install/linux') . ' | bash -s -- ' . $token,
                    'windows_command' => 'powershell -ExecutionPolicy Bypass -Command "`$token=\'' . $token . '\'; irm ' . url('/install/windows.ps1') . ' | iex"',
                ];
            }
        }

        return new self(
            uuid: $server->uuid,
            client_uuid: $server->client->uuid,
            client_name: $server->client->name,
            name: $server->name,
            host_name: $server->host_name,
            cpu_model: $server->cpu_model,
            cpu_cores: $server->cpu_cores,
            ram: $server->ram,
            disk: $server->disk,
            operating_system: $server->operating_system,
            record_status: $server->record_status?->value ?? 'active',
            status: $server->status,
            created_at: $server->created_at->toIso8601String(),
            updated_at: $server->updated_at->toIso8601String(),
            activeProvisionDetails: $activeDetails,
        );
    }
}
