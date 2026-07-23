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

        public float $hourly_cost = 0.0,

        public float $cost_offset = 0.0,

        public ?string $cost_reset_at = null,

        public float $historical_cost = 0.0,

        public ?string $rate_updated_at = null,

        public int $uptime_seconds = 0,

        public float $gross_cost = 0.0,

        public float $net_cost = 0.0,

        public float $accumulated_cost = 0.0,

        public ?string $billing_date = null,
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
                    windows_command: 'powershell -ExecutionPolicy Bypass -Command "`$APP_URL=\'' . url('/') . '\'; & ([scriptblock]::Create((irm `$APP_URL/install/windows.ps1))) -ProvisionToken \'' . $token . '\' -AppUrl `$APP_URL"',
                );
            }
        }

        $tokenModel = $server->provisionTokens()->latest()->first();
        $token = $tokenModel ? $tokenModel->token : '';
        $uninstallLinux = 'sudo curl -fsSL ' . url('/uninstall/linux') . ' | sudo bash -s -- ' . $token;
        $uninstallWindows = 'powershell -ExecutionPolicy Bypass -Command "`$APP_URL=\'' . url('/') . '\'; & ([scriptblock]::Create((irm `$APP_URL/uninstall/windows.ps1))) -ProvisionToken \'' . $token . '\' -AppUrl `$APP_URL"';

        $agent = $server->agent;

        $ports = $agent ? $agent->ports
            ->filter(fn($p) => strtoupper($p->state) === 'LISTENING')
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

        $hourlyCost = (float) ($server->hourly_cost ?? 0.0);
        $costOffset = (float) ($server->cost_offset ?? 0.0);
        $costResetAtStr = $server->cost_reset_at ? $server->cost_reset_at->toIso8601String() : null;
        $historicalCost = (float) ($server->historical_cost ?? 0.0);
        $rateUpdatedAtStr = $server->rate_updated_at ? $server->rate_updated_at->toIso8601String() : null;

        $dbOnlineSeconds = (int) ($server->online_seconds ?? 0);
        $offlineThreshold = (int) \App\Models\Setting::get('offline_threshold', '15');

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
        $monthlyRate = $hourlyCost;
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
            $grossCost = round($billedMonths * $monthlyRate, 4);

            // Next billing date is registration date + $billedMonths months
            $nextBillingDate = $registrationDate->copy()->addMonths($billedMonths);
        } else {
            $grossCost = 0.0;
        }

        // Net cost after deductions
        $netCost = max(0.0, round($grossCost - $costOffset, 4));
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
            status: $server->status,
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
            hourly_cost: $hourlyCost,
            cost_offset: $costOffset,
            cost_reset_at: $costResetAtStr,
            historical_cost: $historicalCost,
            rate_updated_at: $rateUpdatedAtStr,
            uptime_seconds: $uptimeSeconds,
            gross_cost: $grossCost,
            net_cost: $netCost,
            accumulated_cost: $accumulatedCost,
            billing_date: $nextBillingDate ? $nextBillingDate->toIso8601String() : null,
        );
    }
}
