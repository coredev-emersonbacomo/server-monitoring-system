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
use App\Services\NotificationService;
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
        private readonly int $serverId,
        private readonly ?int $alertConfigId = null,
    ) {}

    public function handle(NodeRegistry $registry, NotificationService $notifications): void
    {
        $server = Server::with(['client.secopclients', 'agent', 'latestUpdate'])->find($this->serverId);
        if (!$server || !$server->agent) return;

        $config = $this->alertConfigId
            ? NodeConfig::find($this->alertConfigId)
            : NodeConfig::where('slug', 'alerts')->where('enabled', true)->first();

        $engine = $config ? new NodeConfigEngine($registry) : null;

        $this->evaluateServerAlerts($server, $config, $engine, $notifications);
        $this->evaluateNumericMetrics($server, $config, $engine, $notifications);
        $this->syncServerActionItem($server, $config, $engine);
    }

    private function evaluateServerAlerts(
        Server $server,
        ?NodeConfig $config,
        ?NodeConfigEngine $engine,
        NotificationService $notifications,
    ): void {
        if (!$config || !$engine) return;

        $agent = $server->agent;
        $offlineThresholdMinutes = (int) Setting::get('offline_threshold', '5');
        $isOnline = $agent->last_seen_at && $agent->last_seen_at->greaterThan(
            now()->subMinutes($offlineThresholdMinutes)
        );

        $sourceNodeId = $this->findMetricNode($config, 'server_status');
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
            \App\NodeConfig\Jobs\FireNodeTimer::dispatch(
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
            $this->dispatchNotification($action, $notifications);
        }
    }

    private function evaluateNumericMetrics(
        Server $server,
        ?NodeConfig $config,
        ?NodeConfigEngine $engine,
        NotificationService $notifications,
    ): void {
        if (!$config || !$engine) return;

        $agent = $server->agent;

        $metrics = [
            'cpu_usage' => ['sample_type' => 'cpu', 'sample_name' => 'load1'],
            'memory_usage' => ['sample_type' => 'memory', 'sample_name' => 'percent'],
            'disk_usage' => ['sample_type' => 'disk', 'sample_name' => 'percent'],
        ];

        foreach ($metrics as $metricType => $sampleInfo) {
            $sourceNodeId = $this->findMetricNode($config, $metricType);
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
                \App\NodeConfig\Jobs\FireNodeTimer::dispatch(
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
                $this->dispatchNotification($action, $notifications);
            }
        }
    }

    private function syncServerActionItem(
        Server $server,
        ?NodeConfig $config,
        ?NodeConfigEngine $engine,
    ): void {
        $isOffline = $server->health === ServerHealth::Offline;
        $wouldNotifyOffline = $config && $engine && $this->engineWouldNotifyOffline($server, $config, $engine);

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

        $sourceNodeId = $this->findMetricNode($config, 'server_status');
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

    private function findMetricNode(NodeConfig $config, string $metricType): ?string
    {
        $configData = $config->getParsedConfig();
        $nodes = $configData['nodes'] ?? [];

        foreach ($nodes as $node) {
            if (($node['type'] ?? '') === 'metric' && ($node['settings']['metric_type'] ?? '') === $metricType) {
                return $node['id'];
            }
        }

        return null;
    }

    private function dispatchNotification(array $action, NotificationService $notifications): void
    {
        $settings = $action['settings'];
        $context = $action['upstream_context'] ?? [];

        $serverId = $context['server_id'] ?? null;
        $server = $serverId ? Server::with('client')->find($serverId) : null;

        $templateData = [
            'server' => $server,
            'runtime' => [
                'metricName' => $context['metric_name'] ?? 'Unknown Metric',
                'sustainValue' => $context['sustain_value'] ?? '',
                'offlineDuration' => $server?->agent?->last_seen_at
                    ? now()->diffForHumans($server->agent->last_seen_at, true) . ' ago'
                    : 'unknown',
            ],
        ];

        $subject = $this->resolveTemplates($settings['subject'] ?? 'Alert triggered', $templateData);
        $message = $this->resolveTemplates($settings['message'] ?? 'An alert condition was triggered.', $templateData);

        $channel = $settings['channel'] ?? 'email';

        try {
            match ($channel) {
                'email' => $this->sendEmail($server, $subject, $message, $notifications),
                'discord' => $this->sendDiscord($settings, $message, $notifications),
                default => null,
            };

            Log::info("[server-events] Notification dispatched", [
                'server_id' => $serverId,
                'server' => $server?->name,
                'channel' => $channel,
                'subject' => $subject,
            ]);
        } catch (\Throwable $e) {
            Log::error("[server-events] Notification failed", [
                'server_id' => $serverId,
                'server' => $server?->name,
                'channel' => $channel,
                'error' => $e->getMessage(),
                'node_id' => $action['node_id'],
            ]);
        }
    }

    private function sendEmail(?Server $server, string $subject, string $message, NotificationService $notifications): void
    {
        $emails = $server?->client?->secopclients?->pluck('email')->filter()->values()->all();
        if (empty($emails)) return;

        $notifications->sendEmailAlert($emails, $message, $subject);
    }

    private function sendDiscord(array $settings, string $message, NotificationService $notifications): void
    {
        $botToken = $settings['bot_token'] ?? null;
        $channelId = $settings['channel_id'] ?? null;
        $roleId = $settings['role_id'] ?? null;

        if (!$botToken || !$channelId) return;

        $notifications->sendDiscordAlert($botToken, $roleId ?? '', $message, $channelId);
    }

    private function resolveTemplates(string $text, array $data): string
    {
        return preg_replace_callback('/\{([^}]+)\}/', function ($matches) use ($data) {
            return $this->resolveTemplateVar($matches[1], $data);
        }, $text);
    }

    private function resolveTemplateVar(string $path, array $data): string
    {
        $allowedPrefixes = ['server', 'runtime'];

        if ($path === '' || !preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$/', $path)) {
            return '{' . $path . '}';
        }

        $firstSegment = strtolower(explode('.', $path)[0]);

        if (!in_array($firstSegment, $allowedPrefixes, true)) {
            return '{' . $path . '}';
        }

        $result = data_get($data, $path);

        return $result !== null ? (string) $result : '{' . $path . '}';
    }
}
