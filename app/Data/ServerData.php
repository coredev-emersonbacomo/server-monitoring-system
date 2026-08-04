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

        public ?ProvisionDetailData $activeProvisionDetails = null,

        /** @var PortsData[]|null */
        public ?array $ports = null,

        /** @var ProcessesData[]|null */
        public ?array $processes = null,

        public ?string $uninstall_linux_command = null,

        public ?string $uninstall_windows_command = null,

        public bool $agent_deleted = false,

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
            if ($activeToken && !$activeToken->isExpired()) {
                $token = $activeToken->token;
                $activeDetails = new ProvisionDetailData(
                    token: $token,
                    expires_at: $activeToken->expires_at->copy()->utc()->toIso8601String(),
                    linux_command: 'sudo curl -fsSL ' . url('/install/linux') . ' | sudo bash -s -- ' . $token,
                    windows_command: \App\Services\WindowsCommand::make('/install/windows.ps1', $token, rtrim(url('/'), '/')),
                );
            }
        }

        $tokenModel = $server->provisionTokens()->latest()->first();
        $token = $tokenModel ? $tokenModel->token : '';
        $uninstallLinux = 'sudo curl -fsSL ' . url('/uninstall/linux') . ' | sudo bash -s -- ' . $token;
        $uninstallWindows = \App\Services\WindowsCommand::make('/uninstall/windows.ps1', $token, rtrim(url('/'), '/'));

        $agent = $server->agent;

        $ignoredPorts = [
            135,   // MS RPC / EPMAP
            137,   // NetBIOS Name Service
            138,   // NetBIOS Datagram
            139,   // NetBIOS Session
            445,   // SMB / Microsoft-DS
            500,   // ISAKMP / IPsec
            4500,  // IPsec NAT Traversal
            5353,  // mDNS (Multicast DNS)
            5355,  // LLMNR (Link-Local Multicast Name Resolution)
            7680,  // Windows Delivery Optimization / WUDO
            5985,  // WinRM HTTP
            5986,  // WinRM HTTPS
            49152, 49153, 49154, 49155, 49156, 49157, 49158, 49159, 49160, // Windows RPC Ephemeral Dynamic Port range
        ];

        $ignoredProcessPatterns = [
            'svchost', 'lsass', 'services', 'system', 'spoolsv', 'smss', 'csrss', 'wininit', 'alg', 'dashost'
        ];

        $ports = $agent ? $agent->ports
            ->filter(function ($p) use ($ignoredPorts, $ignoredProcessPatterns) {
                if (strtoupper($p->state) !== 'LISTENING') {
                    return false;
                }

                // Ignore ports in explicit exclusion list
                if (in_array((int) $p->port, $ignoredPorts, true)) {
                    return false;
                }

                // Ignore dynamic RPC high ports (49152-65535) unless explicitly assigned to a recognized DB/service
                if ((int) $p->port >= 49152) {
                    return false;
                }

                // Ignore ports bound to internal OS system background processes
                if ($p->process_name) {
                    $procName = strtolower($p->process_name);
                    foreach ($ignoredProcessPatterns as $pattern) {
                        if (str_contains($procName, $pattern)) {
                            return false;
                        }
                    }
                }

                return true;
            })
            ->map(fn($p) => new PortsData(
                id: $p->id,
                port: $p->port,
                protocol: $p->protocol,
                state: $p->state,
                process: $p->process_name,
                ping_status: $p->ping_status,
                ping_time: $p->ping_time,
            ))->values()->all() : null;

        $processes = $agent ? $agent->processes()->orderByDesc('cpu')->get()->map(fn($pr) => new ProcessesData(
            pid: $pr->pid,
            name: $pr->name,
            cpu: $pr->cpu,
            memory: $pr->memory,
        ))->values()->all() : null;

        $activities = $server->activities()
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(fn($a) => [
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

        $monthlyCost = (float) ($server->monthly_rate ?? 0.0);
        $costOffset = (float) ($server->remitted ?? 0.0);
        $costResetAtStr = $server->cost_reset_at ? $server->cost_reset_at->toIso8601String() : null;
        $historicalCost = (float) ($server->historical_cost ?? 0.0);
        $rateUpdatedAtStr = $server->rate_updated_at ? $server->rate_updated_at->toIso8601String() : null;

        $dbOnlineSeconds = (int) ($server->online_seconds ?? 0);
        $rawOffline = (int) \App\Models\Setting::get('offline_threshold', '15');
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
                if ($server->trashed() || $server->status === 'archived' || $server->record_status === 'archived' || $server->record_status === \App\Enums\RecordStatus::Archived) {
                    return 'archived';
                }

                if (!$agent || !$agent->registered_at) {
                    return $server->status ?? 'pending_installation';
                }

                // If server has registered but is waiting for its first heartbeat, don't mark offline
                if ($server->status === \App\Enums\ServerStatus::WaitingForFirstHeartbeat->value) {
                    return \App\Enums\ServerStatus::WaitingForFirstHeartbeat->value;
                }

                // Live health check: if last heartbeat is past the threshold, go offline immediately
                $lastSeen = $agent->last_seen_at;
                $health = \App\Models\Server::computeHealth($lastSeen, $offlineThreshold);
                $isOffline = $health === \App\Enums\ServerHealth::Offline;
                $wasOffline = $server->status === 'offline';

                if ($isOffline && !$wasOffline) {
                    // Transition to offline — use a cache lock so only the first
                    // concurrent request writes the DB row and log entry.
                    $lockKey = 'server_offline_transition_' . $server->uuid;
                    $acquired = \Illuminate\Support\Facades\Cache::add($lockKey, true, 60);
                    if ($acquired) {
                        $server->updateQuietly([
                            'status'          => 'offline',
                            'went_offline_at' => now(),
                        ]);

                        \App\Models\CustomActivityLog::create([
                            'type'         => 'server_health',
                            'logable_type' => get_class($server),
                            'logable_id'   => $server->id,
                            'user_id'      => null,
                            'user'         => 'System',
                            'action'       => 'Agent Offline',
                            'details'      => json_encode([
                                'message'     => "Agent went offline for server: {$server->name}",
                                'server_name' => $server->name,
                                'last_seen'   => $lastSeen?->toIso8601String(),
                            ]),
                        ]);

                        \App\Models\Activity::create([
                            'server_id'   => $server->id,
                            'agent_id'    => $agent->id,
                            'type'        => 'server_offline',
                            'description' => 'Server transitioned to Offline state.',
                        ]);

                        \App\Models\ActionItem::updateOrCreate(
                            [
                                'action_type' => 'server_offline',
                                'server_id'   => $server->id,
                                'client_id'   => $server->client_id,
                            ],
                            [
                                'message'     => "{$server->name} is offline",
                                'severity'    => 'critical',
                                'client_name' => $server->client?->name ?? 'Unknown',
                                'server_name' => $server->name,
                            ]
                        );
                    }
                    return 'offline';
                }

                if (!$isOffline && $wasOffline) {
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
            uninstall_linux_command: $uninstallLinux,
            uninstall_windows_command: $uninstallWindows,
            agent_deleted: $agent && $agent->registered_at ? (bool) $server->agent_deleted : false,
            activities: $activities,
            agent: $agentData,
            alert_scope: $server->alert_scope ?? 'global',
            uptime_seconds: $uptimeSeconds,
            subscription_fee: (float) ($server->subscription_fee ?? 0.00),
        );
    }
}
