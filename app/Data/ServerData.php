<?php

namespace App\Data;

use App\Models\Server;
use Spatie\LaravelData\Data;

class ServerData extends Data
{
    public function __construct(
        public string $name,

        public ?string $description,

        public string $uuid,

        public string $host_name,

        public string $client_uuid,

        public string $client_name,

        public string $created_at,

        public string $updated_at,

        public string $record_status,
        
        public ?string $cpu_model = null,

        public ?int $cpu_cores = null,

        public ?string $ram = null,

        public ?string $disk = null,

        public ?string $operating_system = null,

        public ?string $status = null,

        /** @var StatPointData[] */
        public array $stats = [],

        /** @var array{token: string, expires_at: string, linux_command: string, windows_command: string}|null */
        public ?array $activeProvisionDetails = null,

        /** @var array{port: int, protocol: string, state: string, process: string|null}[]|null */
        public ?array $ports = null,

        /** @var array{pid: int, name: string, cpu: float|null, memory: float|null}[]|null */
        public ?array $processes = null,
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
                    'windows_command' => 'powershell -ExecutionPolicy Bypass -Command "`$APP_URL=\'' . url('/') . '\'; & ([scriptblock]::Create((irm `$APP_URL/install/windows.ps1))) -ProvisionToken \'' . $token . '\' -AppUrl `$APP_URL"',
                ];
            }
        }

        $agent = $server->agent;

        $ports = $agent ? $agent->ports->map(fn($p) => [
            'port' => $p->port,
            'protocol' => $p->protocol,
            'state' => $p->state,
            'process' => $p->process_name,
        ])->toArray() : null;

        $processes = $agent ? $agent->processes()->orderByDesc('cpu')->get()->map(fn($pr) => [
            'pid' => $pr->pid,
            'name' => $pr->name,
            'cpu' => $pr->cpu,
            'memory' => $pr->memory,
        ])->toArray() : null;

        return new self(
            uuid: $server->uuid,
            description: $server->description,
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
            ports: $ports,
            processes: $processes,
        );
    }
}
