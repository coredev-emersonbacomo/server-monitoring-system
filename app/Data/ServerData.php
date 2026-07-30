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

        public float $monthly_rate = 0.0,

        public float $remitted = 0.0,

        public ?string $cost_reset_at = null,

        public float $historical_cost = 0.0,

        public ?string $rate_updated_at = null,

        public int $uptime_seconds = 0,

        public float $running_balance = 0.0,

        public float $net_cost = 0.0,

        public float $accumulated_cost = 0.0,

        public ?string $billing_date = null,

        public ?float $pending_monthly_rate = null,
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
                    windows_command: 'powershell -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm \'' . url('/install/windows.ps1') . '\'))) -ProvisionToken \'' . $token . '\' -AppUrl \'' . url('/') . '\'"',
                );
            }
        }

        $tokenModel = $server->provisionTokens()->latest()->first();
        $token = $tokenModel ? $tokenModel->token : '';
        $uninstallLinux = 'sudo curl -fsSL ' . url('/uninstall/linux') . ' | sudo bash -s -- ' . $token;
        $uninstallWindows = 'powershell -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm \'' . url('/uninstall/windows.ps1') . '\'))) -ProvisionToken \'' . $token . '\' -AppUrl \'' . url('/') . '\'"';

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

        // Monthly billing only starts once the agent is installed (registered_at set).
        // If no agent has registered yet, cost is 0 and billing date is null.
        $registrationDate = $agent?->registered_at ?? null;
        $monthlyRate = $monthlyCost;
        $nextBillingDate = null;

        if ($registrationDate) {
            // Full or partial months elapsed since registration
            $monthsElapsed = max(1, (int) ceil(now()->diffInDays($registrationDate) / 30.0));
            // Or exact calendar month diff
            $calendarMonths = (now()->year - $registrationDate->year) * 12 + (now()->month - $registrationDate->month);
            if (now()->day >= $registrationDate->day) {
                $calendarMonths += 1;
            }
            $billedMonths = max(1, max($monthsElapsed, $calendarMonths));

            // Next billing date is registration date + $billedMonths months
            $nextBillingDate = $registrationDate->copy()->addMonths($billedMonths);

            // Fetch historical rate update logs to accurately determine the active rate for each billing cycle
            $rateLogs = \App\Models\CustomActivityLog::where('logable_type', get_class($server))
                ->whereIn('logable_id', [(string) $server->uuid, (string) $server->id])
                ->where('action', 'Update Monthly Rate')
                ->orderBy('created_at', 'asc')
                ->get();

            if ($rateLogs->isEmpty()) {
                $runningBalance = round($billedMonths * $monthlyCost, 4);
            } else {
                // Determine initial rate (before the first logged edit)
                $firstLog = $rateLogs->first();
                $firstDetails = is_array($firstLog->details) ? $firstLog->details : (json_decode($firstLog->details, true) ?? []);
                
                $beforeVal = $firstDetails['before']['monthly_rate'] ?? $firstDetails['before']['monthly_cost'] ?? null;
                $initialRate = $beforeVal !== null ? (float) str_replace(',', '', (string) $beforeVal) : (float) $monthlyCost;

                $runningBalance = 0.0;

                for ($i = 0; $i < $billedMonths; $i++) {
                    // Cycle start date: registrationDate + $i months
                    $cycleStartDate = $registrationDate->copy()->addMonths($i);

                    // Find rate that was active when this cycle started
                    $cycleRate = $initialRate;
                    foreach ($rateLogs as $log) {
                        if ($log->created_at->lessThanOrEqualTo($cycleStartDate)) {
                            $logDetails = is_array($log->details) ? $log->details : (json_decode($log->details, true) ?? []);
                            $afterVal = $logDetails['after']['monthly_rate'] ?? $logDetails['after']['monthly_cost'] ?? null;
                            if ($afterVal !== null) {
                                $cycleRate = (float) str_replace(',', '', (string) $afterVal);
                            }
                        }
                    }

                    $runningBalance += $cycleRate;
                }

                $runningBalance = round($runningBalance, 4);
            }

            // Record a log when a new monthly billing cycle rollover charge is evaluated
            $lastBilledCycleKey = "server_last_logged_cycle_{$server->uuid}";
            $lastLoggedCycle = \Illuminate\Support\Facades\Cache::get($lastBilledCycleKey, 0);
            if ($billedMonths > $lastLoggedCycle) {
                \Illuminate\Support\Facades\Cache::put($lastBilledCycleKey, $billedMonths, now()->addYear());

                // Create a Monthly Charge log for the newly added billing cycle
                $currentCycleRate = (float) $monthlyCost;
                $formattedRate = number_format($currentCycleRate, 2);
                $formattedTotal = number_format($runningBalance, 2);

                \App\Models\CustomActivityLog::create([
                    'type'         => 'billing',
                    'logable_type' => get_class($server),
                    'logable_id'   => (string) $server->uuid,
                    'user_id'      => null,
                    'user'         => 'System',
                    'action'       => 'Monthly Charge',
                    'details'      => [
                        'message'        => "Monthly charge of ₱{$formattedRate} applied for cycle #{$billedMonths} on server: {$server->name}",
                        'cycle_number'   => $billedMonths,
                        'rate_applied'   => $currentCycleRate,
                        'running_balance'=> $runningBalance,
                        'server_name'    => $server->name,
                    ],
                ]);
            }
        } else {
            $runningBalance = 0.0;
        }

        // Net cost after deductions
        $netCost = max(0.0, round($runningBalance - $costOffset, 4));
        $accumulatedCost = $netCost;

        // Sync database column so accumulated_cost is saved directly in the servers table
        if (abs((float) ($server->accumulated_cost ?? 0.0) - $accumulatedCost) > 0.0001) {
            $server->updateQuietly(['accumulated_cost' => $accumulatedCost]);
        }

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
            status: (function () use ($server, $agent, $offlineThreshold): string {
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
            monthly_rate: $monthlyCost,
            remitted: $costOffset,
            cost_reset_at: $costResetAtStr,
            historical_cost: $historicalCost,
            rate_updated_at: $rateUpdatedAtStr,
            uptime_seconds: $uptimeSeconds,
            running_balance: $runningBalance,
            net_cost: $netCost,
            accumulated_cost: $accumulatedCost,
            billing_date: $nextBillingDate ? $nextBillingDate->toIso8601String() : null,
            pending_monthly_rate: $server->pending_monthly_rate,
        );
    }
}
