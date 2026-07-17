<?php

namespace App\Jobs;

use App\Enums\ServerHealth;
use App\Models\ActionItem;
use App\Models\MetricSample;
use App\Models\Server;
use App\Models\Setting;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\Jobs\FireNodeTimer;
use App\NodeConfig\Services\NodeConfigNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class MonitorServer implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 30;

    public function __construct(
        private readonly string $serverUuid,
    ) {}

    public function handle(NodeRegistry $registry, NodeConfigNotificationService $notifications): void
    {
        $server = Server::with(['client.secopclients', 'agent', 'latestUpdate'])->where('uuid', $this->serverUuid)->first();
        if (!$server || !$server->agent) return;

        $config = NodeConfig::resolveForServer($this->serverUuid);
        if (!$config || !$config->enabled) return;

        $engine = new NodeConfigEngine($registry);

        $this->evaluateServerAlerts($server, $config, $engine, $notifications);
        $this->evaluateNumericMetrics($server, $config, $engine, $notifications);
        $this->syncServerActionItem($server, $config, $engine);
    }

    private function evaluateServerAlerts(
        Server $server,
        NodeConfig $config,
        NodeConfigEngine $engine,
        NodeConfigNotificationService $notifications,
    ): void {
        $agent = $server->agent;
        $offlineThresholdMinutes = (int) Setting::get('offline_threshold', '5');
        $isOnline = $agent->last_seen_at && $agent->last_seen_at->greaterThan(
            now()->subMinutes($offlineThresholdMinutes)
        );

        $sourceNodeId = $engine->findMetricNode($config, 'server_status');
        if (!$sourceNodeId) return;

        $extraState = [
            'server_id' => $server->id,
            'server_name' => $server->name,
            'client_name' => $server->client?->name ?? 'Unknown',
            'metric_type' => 'server_status',
        ];

        $result = $engine->trigger($config, $sourceNodeId, $isOnline ? 'online' : 'offline', $extraState);
        if (!$result['success']) return;

        foreach ($result['timers'] as $timer) {
            FireNodeTimer::dispatch(
                $timer['node_config_id'],
                $timer['node_id'],
                array_merge($timer['context'], $extraState),
            )->delay(now()->addMilliseconds($timer['delay_ms']));
        }

        foreach ($result['actions'] as $action) {
            Log::info("[server-events] Alert triggered", [
                'server_id' => $server->id,
                'server' => $server->name,
                'status' => $isOnline ? 'online' : 'offline',
                'metric' => 'server_status',
                'node' => $action['node_id'],
            ]);
            $notifications->dispatchAction($action);
        }
    }

    private function evaluateNumericMetrics(
        Server $server,
        NodeConfig $config,
        NodeConfigEngine $engine,
        NodeConfigNotificationService $notifications,
    ): void {
        $agent = $server->agent;

        $metrics = [
            'cpu_usage' => ['sample_type' => 'cpu', 'sample_name' => 'load1'],
            'memory_usage' => ['sample_type' => 'memory', 'sample_name' => 'percent'],
            'disk_usage' => ['sample_type' => 'disk', 'sample_name' => 'percent'],
        ];

        foreach ($metrics as $metricType => $sampleInfo) {
            $sourceNodeId = $engine->findMetricNode($config, $metricType);
            if (!$sourceNodeId) continue;

            $latestSample = MetricSample::whereHas('batch', function ($q) use ($agent) {
                $q->where('agent_id', $agent->id);
            })
                ->where('metric_type', $sampleInfo['sample_type'])
                ->where('metric_name', $sampleInfo['sample_name'])
                ->latest('recorded_at')
                ->first();

            if (!$latestSample) continue;

            $extraState = [
                'server_id' => $server->id,
                'server_name' => $server->name,
                'client_name' => $server->client?->name ?? 'Unknown',
                'metric_type' => $metricType,
            ];

            $result = $engine->trigger($config, $sourceNodeId, $latestSample->value, $extraState);
            if (!$result['success']) continue;

            foreach ($result['timers'] as $timer) {
                FireNodeTimer::dispatch(
                    $timer['node_config_id'],
                    $timer['node_id'],
                    array_merge($timer['context'], $extraState),
                )->delay(now()->addMilliseconds($timer['delay_ms']));
            }

            foreach ($result['actions'] as $action) {
                Log::info("[server-events] Alert triggered", [
                    'server_id' => $server->id,
                    'server' => $server->name,
                    'metric' => $metricType,
                    'value' => $latestSample->value,
                    'node' => $action['node_id'],
                ]);
                $notifications->dispatchAction($action);
            }
        }
    }

    private function syncServerActionItem(
        Server $server,
        NodeConfig $config,
        NodeConfigEngine $engine,
    ): void {
        $isOffline = $server->health === ServerHealth::Offline;
        $wouldNotifyOffline = $this->engineWouldNotifyOffline($server, $config, $engine);

        if (!$isOffline && !$wouldNotifyOffline) {
            $resolved = ActionItem::where('action_type', 'server_offline')
                ->where('server_id', $server->id)
                ->where('status', 'open')
                ->update(['status' => 'completed', 'completed_at' => now()]);

            if ($resolved) {
                Log::info("[server-events] Server recovered", [
                    'server_id' => $server->id,
                    'server' => $server->name,
                ]);
            }
            return;
        }

        $message = $isOffline
            ? "{$server->name} is offline"
            : "{$server->name} is offline (sustained condition met)";

        Log::warning("[server-events] " . ($isOffline ? 'Server offline' : 'Sustained offline condition'), [
            'server_id' => $server->id,
            'server' => $server->name,
            'reason' => $isOffline ? 'heartbeat_timeout' : 'sustained_condition',
        ]);

        ActionItem::updateOrCreate(
            [
                'action_type' => 'server_offline',
                'server_id' => $server->id,
                'client_id' => $server->client_id,
            ],
            [
                'message' => $message,
                'severity' => 'critical',
                'client_name' => $server->client?->name ?? 'Unknown',
                'server_name' => $server->name,
            ]
        );
    }

    private function engineWouldNotifyOffline(Server $server, NodeConfig $config, NodeConfigEngine $engine): bool
    {
        $agent = $server->agent;
        if (!$agent) return false;

        $offlineThresholdMinutes = (int) Setting::get('offline_threshold', '5');
        $isOnline = $agent->last_seen_at && $agent->last_seen_at->greaterThan(
            now()->subMinutes($offlineThresholdMinutes)
        );

        if ($isOnline) return false;

        $sourceNodeId = $engine->findMetricNode($config, 'server_status');
        if (!$sourceNodeId) return false;

        $result = $engine->trigger($config, $sourceNodeId, 'offline', [
            'server_id' => $server->id,
            'server_name' => $server->name,
            'client_name' => $server->client?->name ?? 'Unknown',
            'metric_type' => 'server_status',
        ]);

        if (!$result['success']) return false;

        foreach ($result['actions'] as $action) {
            if ($action['type'] === 'notification') return true;
        }

        return false;
    }
}
