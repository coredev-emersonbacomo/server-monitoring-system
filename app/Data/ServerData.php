<?php

namespace App\Data;

use App\Enums\RecordStatus;
use App\Enums\ServerHealth;
use App\Enums\ServerStatus;
use App\Models\ActionItem;
use App\Models\Activity;
use App\Models\CustomActivityLog;
use App\Models\Server;
use App\Models\Setting;
use App\Services\WindowsCommand;
use Illuminate\Support\Facades\Cache;
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

        public ?ProvisionDetailData $activeProvisionDetails = null,

        /** @var PortsData[]|null */
        public ?array $ports = null,

        /** @var ProcessesData[]|null */
        public ?array $processes = null,

        /** @var ProcessesData[]|null Noise-filtered discovered set for the monitoring filter. */
        public ?array $available_processes = null,

        /** @var PortsData[]|null Noise-filtered discovered set for the monitoring filter. */
        public ?array $available_ports = null,

        public ?string $uninstall_linux_command = null,

        public ?string $uninstall_windows_command = null,

        public bool $agent_deleted = false,

        /** @var int[]|null Explicit port filter (null = monitor all noise-filtered ports). */
        public ?array $port_filter = null,

        /** @var string[]|null Explicit process filter (null = monitor all processes). */
        public ?array $process_filter = null,

        /** @var array{type: string, description: string, created_at: string}[]|null */
        public ?array $activities = null,

        /** @var AgentData|null */
        public ?AgentData $agent = null,

        public string $alert_scope = 'global',

        public int $uptime_seconds = 0,

        public float $subscription_fee = 0.00,
    ) {}

    public static function fromModel(Server $server): self
    {
        $activeDetails = null;
        if (in_array($server->status, ['pending_installation', 'waiting_for_installation'])) {
            $activeToken = $server->activeProvisionToken;
            if ($activeToken && ! $activeToken->isExpired()) {
                $token = $activeToken->token;
                $activeDetails = new ProvisionDetailData(
                    token: $token,
                    expires_at: $activeToken->expires_at->copy()->utc()->toIso8601String(),
                    linux_command: 'sudo curl -fsSL '.url('/install/linux').' | sudo bash -s -- '.$token,
                    windows_command: WindowsCommand::make('/install/windows.ps1', $token, rtrim(url('/'), '/')),
                );
            }
        }

        $tokenModel = $server->provisionTokens()->latest()->first();
        $token = $tokenModel ? $tokenModel->token : '';
        $uninstallLinux = 'sudo curl -fsSL '.url('/uninstall/linux').' | sudo bash -s -- '.$token;
        $uninstallWindows = WindowsCommand::make('/uninstall/windows.ps1', $token, rtrim(url('/'), '/'));

        $agent = $server->agent;

        // The DB only ever holds what the agent sent (already noise-filtered
        // on the agent, then filtered to the server's filter). Every row — including
        // currently-closed ports — is history the SecOps filter can see.
        $ports = $agent ? $agent->ports
            ->sortByDesc('state')
            ->values()
            ->map(fn ($p) => new PortsData(
                id: $p->id,
                port: $p->port,
                protocol: $p->protocol,
                state: $p->state,
                process: $p->process_name,
                ping_status: $p->ping_status,
                ping_time: $p->ping_time,
                last_seen: $p->last_seen?->toIso8601String(),
            ))->values()->all() : null;

        $processes = $agent ? $agent->processes()->orderByDesc('cpu')->get()->map(fn ($pr) => new ProcessesData(
            pid: $pr->pid,
            name: $pr->name,
            cpu: $pr->cpu,
            memory: $pr->memory,
            last_seen: $pr->last_seen?->toIso8601String(),
            pids: $pr->pids,
        ))->values()->all() : null;

        // The available sets are the noise-filtered discovery snapshot the
        // agent sends every heartbeat, used to build the monitoring filter
        // options (what CAN be monitored, not only what is monitored now).
        $availableProcesses = $agent && $agent->available_processes
            ? array_map(fn ($p) => new ProcessesData(
                pid: $p['pid'] ?? 0,
                name: $p['name'] ?? 'unknown',
                cpu: $p['cpu'] ?? 0.0,
                memory: $p['memory'] ?? 0.0,
                last_seen: null,
                pids: $p['pids'] ?? null,
            ), $agent->available_processes)
            : null;

        $availablePorts = $agent && $agent->available_ports
            ? array_map(fn ($p) => new PortsData(
                id: $p['port'] ?? 0,
                port: $p['port'] ?? 0,
                protocol: $p['protocol'] ?? 'tcp',
                state: $p['state'] ?? 'listening',
                process: $p['process'] ?? null,
                ping_status: null,
                ping_time: null,
                last_seen: null,
            ), $agent->available_ports)
            : null;

        $activities = $server->activities()
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(fn ($a) => [
                'type' => $a->type,
                'description' => $a->description,
                'created_at' => $a->created_at->toIso8601String(),
            ])
            ->toArray();

        $agentData = null;
        if ($agent) {
            $config = $agent->currentConfiguration;
            $agentData = new AgentData(
                version: $agent->version,
                status: $agent->status,
                registered_at: $agent->registered_at->toIso8601String(),
                last_seen_at: $agent->last_seen_at?->toIso8601String(),
                heartbeat_interval: $config ? $config->heartbeat_interval : 5,
                metrics_interval: $config ? $config->metrics_interval : 5,
                port_scan_interval: $config ? $config->port_scan_interval : 60,
                service_scan_interval: $config ? $config->service_scan_interval : 60,
                process_scan_interval: $config ? $config->process_scan_interval : 60,
                update_channel: $config ? $config->update_channel : 'stable',
                auto_update: $config ? (bool) $config->auto_update : true,
            );
        }

        $dbOnlineSeconds = (int) ($server->online_seconds ?? 0);
        $rawOffline = (int) Setting::get('offline_threshold', '15');
        $offlineThreshold = $rawOffline >= 1000 ? intdiv($rawOffline, 1000) : ($rawOffline ?: 15);

        $pendingSeconds = 0;
        if ($server->status === 'online' && $agent && $agent->last_seen_at) {
            $elapsedSinceHeartbeat = (int) $agent->last_seen_at->diffInSeconds(now());
            if ($elapsedSinceHeartbeat > 0 && $elapsedSinceHeartbeat <= ($offlineThreshold + 5)) {
                $pendingSeconds = $elapsedSinceHeartbeat;
            }
        }

        $uptimeSeconds = $dbOnlineSeconds + $pendingSeconds;

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
            record_status: is_string($server->record_status) ? $server->record_status : ($server->record_status?->value ?? ($server->trashed() ? 'archived' : 'active')),
            status: (function () use ($server, $agent, $offlineThreshold): string {
                if ($server->trashed() || $server->status === 'archived' || $server->record_status === 'archived' || $server->record_status === RecordStatus::Archived) {
                    return 'archived';
                }

                if ($server->agent_deleted) {
                    return 'offline';
                }

                if (! $agent || ! $agent->registered_at) {
                    return $server->status ?? 'pending_installation';
                }

                // If server has registered but is waiting for its first heartbeat, don't mark offline
                if ($server->status === ServerStatus::WaitingForFirstHeartbeat->value) {
                    return ServerStatus::WaitingForFirstHeartbeat->value;
                }

                // Live health check: if last heartbeat is past the threshold, go offline immediately
                $lastSeen = $agent->last_seen_at;
                $health = Server::computeHealth($lastSeen, $offlineThreshold);
                $isOffline = $health === ServerHealth::Offline;
                $wasOffline = $server->status === 'offline';

                if ($isOffline && ! $wasOffline) {
                    // Transition to offline — use a cache lock so only the first
                    // concurrent request writes the DB row and log entry.
                    $lockKey = 'server_offline_transition_'.$server->uuid;
                    $acquired = Cache::add($lockKey, true, 60);
                    if ($acquired) {
                        $server->updateQuietly([
                            'status' => 'offline',
                            'went_offline_at' => now(),
                        ]);

                        CustomActivityLog::create([
                            'type' => 'server_health',
                            'logable_type' => get_class($server),
                            'logable_id' => $server->id,
                            'user_id' => null,
                            'user' => 'System',
                            'action' => 'Agent Offline',
                            'details' => json_encode([
                                'message' => "Agent went offline for server: {$server->name}",
                                'server_name' => $server->name,
                                'last_seen' => $lastSeen?->toIso8601String(),
                            ]),
                        ]);

                        Activity::create([
                            'server_id' => $server->id,
                            'agent_id' => $agent->id,
                            'type' => 'server_offline',
                            'description' => 'Server transitioned to Offline state.',
                        ]);

                        ActionItem::updateOrCreate(
                            [
                                'action_type' => 'server_offline',
                                'server_id' => $server->id,
                                'client_id' => $server->client_id,
                            ],
                            [
                                'message' => "{$server->name} is offline",
                                'severity' => 'critical',
                                'client_name' => $server->client?->name ?? 'Unknown',
                                'server_name' => $server->name,
                            ]
                        );
                    }

                    return 'offline';
                }

                if (! $isOffline && $wasOffline) {
                    // Recovery is handled by HeartbeatService when the next heartbeat arrives.
                    // Just reflect the live online state without re-logging here.
                    return 'online';
                }

                return $isOffline ? 'offline' : ($server->status ?? 'online');
            })(),
            created_at: $server->created_at->toIso8601String(),
            updated_at: $server->updated_at->toIso8601String(),
            activeProvisionDetails: $activeDetails,
            ports: $ports,
            processes: $processes,
            available_processes: $availableProcesses,
            available_ports: $availablePorts,
            uninstall_linux_command: $uninstallLinux,
            uninstall_windows_command: $uninstallWindows,
            agent_deleted: $agent && $agent->registered_at ? (bool) $server->agent_deleted : false,
            port_filter: $server->port_filter,
            process_filter: $server->process_filter,
            activities: $activities,
            agent: $agentData,
            alert_scope: $server->alert_scope ?? 'global',
            uptime_seconds: $uptimeSeconds,
            subscription_fee: (float) ($server->subscription_fee ?? 0.00),
        );
    }
}
