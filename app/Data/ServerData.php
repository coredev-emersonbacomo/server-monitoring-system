<?php

namespace App\Data;

use App\Enums\RecordStatus;
use App\Enums\ServerHealth;
use App\Enums\ServerStatus;
use App\Models\ActionItem;
use App\Models\Activity;
use App\Models\Agent;
use App\Models\CustomActivityLog;
use App\Models\Server;
use App\Models\ServerUpdate;
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

        /** @var array<int, array{interface: string, type: string, state: string}>|null Non-disconnected interfaces for the network filter. */
        public ?array $available_interfaces = null,

        public ?string $uninstall_linux_command = null,

        public ?string $uninstall_windows_command = null,

        public ?string $detach_linux_command = null,

        public ?string $detach_windows_command = null,

        public bool $agent_deleted = false,

        /** @var int[]|null Explicit port filter (null = monitor all noise-filtered ports). */
        public ?array $port_filter = null,

        /** @var string[]|null Explicit process filter (null = monitor all processes). */
        public ?array $process_filter = null,

        /** @var string[]|null Explicit network interface filter (null = monitor all non-disconnected interfaces). */
        public ?array $network_filter = null,

        /** @var array{type: string, description: string, created_at: string}[]|null */
        public ?array $activities = null,

        /** @var AgentData|null */
        public ?AgentData $agent = null,

        public string $alert_scope = 'global',

        public int $uptime_seconds = 0,

        public float $subscription_fee = 0.00,

        public ?int $agent_server_count = null,

        public bool $is_assigned_to_current_user = false,
    ) {}

    public static function fromModel(Server $server): self
    {
        $user = auth()->user();
        $isAssignedToCurrentUser = false;
        if ($user && $server->client) {
            $isAssignedToCurrentUser = $server->client->secopclients()
                ->where('user_id', $user->id)
                ->exists();
        }
        $activeDetails = null;
        if (in_array($server->status, ['pending_installation', 'waiting_for_installation'])) {
            $activeToken = $server->activeProvisionToken;
            if ($activeToken && ! $activeToken->isExpired()) {
                $token = $activeToken->token;
                $activeDetails = new ProvisionDetailData(
                    token: $token,
                    expires_at: $activeToken->expires_at->copy()->utc()->toIso8601String(),
                    linux_command: 'sudo curl -fsSL'.(filter_var(env('NGROK_SKIP_BROWSER_WARNING', false), FILTER_VALIDATE_BOOLEAN) ? ' -H "ngrok-skip-browser-warning: true"' : '').' '.rtrim(env('APP_URL') ?: url('/'), '/').'/install/linux'.' | sudo bash -s -- '.$token,
                    windows_command: WindowsCommand::make('/install/windows.ps1', '-ProvisionToken', $token, rtrim(env('APP_URL') ?: url('/'), '/')),
                );
            }
        }

        $agent = $server->agent;

        // For an uninstalled server with past data, keep showing last known agent
        // instead of "No agent data". The agent row still exists (revoked) and
        // the server's agent_id was nulled on detach.
        $fallbackAgent = null;
        if (! $agent) {
            // For any server without a current agent but with past data, show last known agent.
            // This covers agent_uninstalled, pending_installation after prior install, etc.
            // Don't depend only on agent_deleted — a re-provisioned server is pending_installation
            // with agent_deleted still true or with a new token but past data exists.
            $lastActivity = Activity::where('server_id', $server->id)
                ->whereIn('type', ['server_detached', 'agent_uninstalled', 'server_offline'])
                ->latest('created_at')
                ->first();
            if ($lastActivity?->agent_id) {
                $fallbackAgent = Agent::find($lastActivity->agent_id);
            }
            if (! $fallbackAgent) {
                // Fallback to any recently revoked agent that ever monitored this server's host
                // (single-agent per host — last revoked is the best guess)
                $fallbackAgent = Activity::where('type', 'agent_uninstalled')
                    ->where('description', 'like', "%{$server->name}%")
                    ->latest('created_at')
                    ->first();
                if ($fallbackAgent?->agent_id) {
                    $fallbackAgent = Agent::find($fallbackAgent->agent_id);
                } else {
                    $fallbackAgent = Agent::where('status', 'revoked')
                        ->latest('revoked_at')
                        ->first();
                }
            }
            // Only keep fallback if that agent actually has data for this server
            // (ports/processes or server_updates). Otherwise leave as "No agent data".
            if ($fallbackAgent && $fallbackAgent->processes()->count() === 0 && $fallbackAgent->ports()->count() === 0) {
                // Check if server has any historical ServerUpdate
                $hasHistory = ServerUpdate::where('server_id', $server->id)->exists();
                if (! $hasHistory) {
                    $fallbackAgent = null;
                }
            }
        }
        $displayAgent = $agent ?? $fallbackAgent;

        // Uninstall targets the agent's immutable installation UUID (the public
        // identity the install scripts name everything after), not the
        // one-time provision token (which is already consumed/expired by the
        // time an agent is installed). With no installed agent there is
        // nothing to uninstall, so the commands stay null.
        // For uninstalled with past data we still show last agent via displayAgent,
        // but uninstall commands are only for the currently installed agent.
        $installationId = $agent?->installation_uuid;
        $appUrl = rtrim(env('APP_URL') ?: url('/'), '/');

        $uninstallLinux = $installationId
            ? 'sudo curl -fsSL'.(filter_var(env('NGROK_SKIP_BROWSER_WARNING', false), FILTER_VALIDATE_BOOLEAN) ? ' -H "ngrok-skip-browser-warning: true"' : '').' '.rtrim(env('APP_URL') ?: url('/'), '/').'/uninstall/linux'.' | sudo bash -s -- '.$installationId
            : null;
        $uninstallWindows = $installationId
            ? WindowsCommand::make('/uninstall/windows.ps1', '-Instance', $installationId, $appUrl)
            : null;
        $detachLinux = $installationId
            ? 'sudo curl -fsSL'.(filter_var(env('NGROK_SKIP_BROWSER_WARNING', false), FILTER_VALIDATE_BOOLEAN) ? ' -H "ngrok-skip-browser-warning: true"' : '').' '.url('/detach/linux').' | sudo bash -s -- '.$installationId.' '.$server->uuid
            : null;
        $detachWindows = $installationId
            ? WindowsCommand::make('/detach/windows.ps1', '-Instance', $installationId, $appUrl, '-Server', $server->uuid)
            : null;

        // The DB only ever holds what the agent sent (already noise-filtered
        // on the agent, then filtered to the server's filter). Every row — including
        // currently-closed ports — is history the SecOps filter can see.
        // For uninstalled with past data, show last known agent's data.
        $effectiveAgent = $displayAgent ?? $agent;
        $ports = $effectiveAgent ? $effectiveAgent->ports
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

        $processes = $effectiveAgent ? $effectiveAgent->processes()->orderByDesc('cpu')->get()->map(fn ($pr) => new ProcessesData(
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
        $availableProcesses = $effectiveAgent && $effectiveAgent->available_processes
            ? array_map(fn ($p) => new ProcessesData(
                pid: $p['pid'] ?? 0,
                name: $p['name'] ?? 'unknown',
                cpu: $p['cpu'] ?? 0.0,
                memory: $p['memory'] ?? 0.0,
                last_seen: null,
                pids: $p['pids'] ?? null,
            ), $effectiveAgent->available_processes)
            : null;

        $availablePorts = $effectiveAgent && $effectiveAgent->available_ports
            ? array_map(fn ($p) => new PortsData(
                id: $p['port'] ?? 0,
                port: $p['port'] ?? 0,
                protocol: $p['protocol'] ?? 'tcp',
                state: $p['state'] ?? 'listening',
                process: $p['process'] ?? null,
                ping_status: null,
                ping_time: null,
                last_seen: null,
            ), $effectiveAgent->available_ports)
            : null;

        $availableInterfaces = $effectiveAgent && $effectiveAgent->available_interfaces
            ? array_values($effectiveAgent->available_interfaces)
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

        $agentServerCount = null;
        $agentForCount = $effectiveAgent ?? $agent;
        if ($agentForCount) {
            $agentServerCount = $agentForCount->monitoredServers()->where('agent_deleted', false)->count();
            // Fallback to at least 1 if the agent exists but count is 0 due to race
            if ($agentServerCount === 0 && $agentForCount->monitoredServers()->withTrashed()->count() > 0) {
                $agentServerCount = 1;
            }
        } elseif ($server->agent_deleted) {
            // For uninstalled, show 0
            $agentServerCount = 0;
        }

        $agentData = null;
        // For uninstalled with past data, show last known agent (revoked) — the
        // live $agent is null but $effectiveAgent holds the last one.
        $agentForData = $effectiveAgent ?? $agent;
        if ($agentForData) {
            $config = $agentForData->currentConfiguration;
            // If the agent is the revoked fallback, currentConfiguration may be null;
            // still show last known version/status.
            $agentData = new AgentData(
                version: $agentForData->version,
                status: $agentForData->status,
                registered_at: $agentForData->registered_at->toIso8601String(),
                last_seen_at: $agentForData->last_seen_at?->toIso8601String(),
                heartbeat_interval: $config ? $config->heartbeat_interval : 5,
                metrics_interval: $config ? $config->metrics_interval : 5,
                port_scan_interval: $config ? $config->port_scan_interval : 60,
                service_scan_interval: $config ? $config->service_scan_interval : 60,
                process_scan_interval: $config ? $config->process_scan_interval : 60,
                update_channel: $config ? $config->update_channel : 'stable',
                auto_update: $config ? (bool) $config->auto_update : true,
                is_alive: $agentForData->isAlive(),
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

                if ($server->status === ServerStatus::AgentUninstalled->value) {
                    return ServerStatus::AgentUninstalled->value;
                }

                if ($server->agent_deleted) {
                    return ServerStatus::AgentUninstalled->value;
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
                            'user' => null,
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
                                'status' => 'open',
                                'assigned_to' => null,
                                'completed_at' => null,
                                'created_at' => now(),
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
            available_interfaces: $availableInterfaces,
            uninstall_linux_command: $uninstallLinux,
            uninstall_windows_command: $uninstallWindows,
            detach_linux_command: $detachLinux,
            detach_windows_command: $detachWindows,
            agent_deleted: $agent && $agent->registered_at ? (bool) $server->agent_deleted : false,
            port_filter: $server->port_filter,
            process_filter: $server->process_filter,
            network_filter: $server->network_filter,
            activities: $activities,
            agent: $agentData,
            alert_scope: $server->alert_scope ?? 'global',
            uptime_seconds: $uptimeSeconds,
            subscription_fee: (float) ($server->subscription_fee ?? 0.00),
            agent_server_count: $agentServerCount,
            is_assigned_to_current_user: $isAssignedToCurrentUser,
        );
    }
}
