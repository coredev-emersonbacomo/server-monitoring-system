<?php

namespace App\NodeConfig\Engine;

use App\NodeConfig\Cache\NodeConfigCache;
use App\NodeConfig\Services\NodeConfigNotificationService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class NodeTaskScheduler
{
    private const PREFIX = 'node_task:';
    private const INDEX_KEY = 'node_task:index';
    private const TTL = 3600;

    private static function store()
    {
        return Cache::store(config('cache.default', 'file'));
    }

    public static function schedule(
        int $configId,
        string $nodeId,
        int $delayMs,
        array $context,
        ?int $serverId = null,
    ): string {
        $taskId = self::generateTaskId($configId, $nodeId, $context, $serverId);

        $store = self::store();
        $index = $store->get(self::INDEX_KEY) ?? [];

        // If a task with this ID is already queued, don't overwrite it.
        // Overwriting resets fire_at on every heartbeat, breaking the countdown.
        if (isset($index[$taskId])) {
            Log::debug("[node-task-scheduler] Task already queued, skipping", [
                'task_id' => $taskId,
            ]);
            return $taskId;
        }

        $fireAt = microtime(true) + ($delayMs / 1000);

        $task = [
            'task_id'      => $taskId,
            'config_id'    => $configId,
            'node_id'      => $nodeId,
            'server_id'    => $serverId,
            'context'      => $context,
            'fire_at'      => $fireAt,
            'delay_ms'     => $delayMs,
            'created_at'   => microtime(true),
        ];

        $store->put(self::PREFIX . $taskId, $task, self::TTL);

        $index[$taskId] = $fireAt;
        $store->put(self::INDEX_KEY, $index, self::TTL);

        Log::debug("[node-task-scheduler] Scheduled task", [
            'task_id'   => $taskId,
            'config_id' => $configId,
            'node_id'   => $nodeId,
            'server_id' => $serverId,
            'delay_ms'  => $delayMs,
            'fire_at'   => date('Y-m-d H:i:s', (int) $fireAt),
        ]);

        \App\Events\SystemTelemetryEvent::emit('task_scheduled', $task);

        return $taskId;
    }

    public static function cancel(string $taskId): bool
    {
        $store = self::store();
        $store->forget(self::PREFIX . $taskId);

        $index = $store->get(self::INDEX_KEY) ?? [];
        unset($index[$taskId]);
        $store->put(self::INDEX_KEY, $index, self::TTL);

        Log::debug("[node-task-scheduler] Cancelled task", ['task_id' => $taskId]);
        \App\Events\SystemTelemetryEvent::emit('task_cancelled', ['task_id' => $taskId]);
        return true;
    }

    public static function cancelByNode(string $nodeId, ?string $metricType = null, ?int $serverId = null): int
    {
        $store = self::store();
        $index = $store->get(self::INDEX_KEY) ?? [];
        $cancelled = 0;

        foreach (array_keys($index) as $taskId) {
            $parts = explode(':', $taskId);
            if (count($parts) === 4) {
                [,$taskNodeId, $taskMetric, $taskServerId] = $parts;
            } elseif (count($parts) === 3) {
                [$taskNodeId, $taskMetric, $taskServerId] = $parts;
            } else {
                continue;
            }

            if ($taskNodeId !== $nodeId) continue;
            if ($metricType !== null && $taskMetric !== $metricType) continue;
            if ($serverId !== null && (int) $taskServerId !== $serverId) continue;

            $store->forget(self::PREFIX . $taskId);
            unset($index[$taskId]);
            $cancelled++;
            \App\Events\SystemTelemetryEvent::emit('task_cancelled', ['task_id' => $taskId]);
        }

        $store->put(self::INDEX_KEY, $index, self::TTL);

        if ($cancelled > 0) {
            Log::debug("[node-task-scheduler] Cancelled tasks by node", [
                'node_id'     => $nodeId,
                'metric_type' => $metricType,
                'server_id'   => $serverId,
                'count'       => $cancelled,
            ]);
        }

        return $cancelled;
    }

    public static function cancelByServer(int $serverId): int
    {
        $store = self::store();
        $index = $store->get(self::INDEX_KEY) ?? [];
        $cancelled = 0;

        $suffix = ":{$serverId}";

        foreach (array_keys($index) as $taskId) {
            if (str_ends_with($taskId, $suffix)) {
                $store->forget(self::PREFIX . $taskId);
                unset($index[$taskId]);
                $cancelled++;
            }
        }

        $store->put(self::INDEX_KEY, $index, self::TTL);

        if ($cancelled > 0) {
            Log::debug("[node-task-scheduler] Cancelled all tasks for server", [
                'server_id' => $serverId,
                'count'     => $cancelled,
            ]);
        }

        return $cancelled;
    }

    public static function getAllActiveTasks(): array
    {
        $store = self::store();
        $index = $store->get(self::INDEX_KEY) ?? [];
        $tasks = [];

        foreach (array_keys($index) as $taskId) {
            $task = $store->get(self::PREFIX . $taskId);
            if ($task) {
                $tasks[] = self::enrichTaskWithMetrics($task);
            }
        }

        return $tasks;
    }

    public static function getActiveTasks(int $configId, ?int $serverId = null): array
    {
        $store = self::store();
        $index = $store->get(self::INDEX_KEY) ?? [];
        $tasks = [];

        foreach (array_keys($index) as $taskId) {
            $task = $store->get(self::PREFIX . $taskId);
            if (!$task) continue;

            if ($task['config_id'] !== $configId) continue;
            if ($serverId !== null && $task['server_id'] !== $serverId) continue;

            $tasks[] = self::enrichTaskWithMetrics($task);
        }

        return $tasks;
    }

    private static function enrichTaskWithMetrics(array $task): array
    {
        $serverId = $task['server_id'] ?? null;
        $context  = $task['context'] ?? [];
        $metricType = $context['metric_type'] ?? null;
        $threshold  = $context['threshold'] ?? null;
        $operator   = $context['operator'] ?? 'greater_than';
        $createdAt  = $task['created_at'] ?? microtime(true);
        $delayMs    = $task['delay_ms'] ?? 0;

        if (!$serverId || !$metricType || $threshold === null) {
            return $task;
        }

        $agent = \App\Models\Agent::where('server_id', $serverId)->first();
        if (!$agent) {
            return $task;
        }

        $metricNameMap = [
            'cpu_usage'     => 'load1',
            'memory_usage'  => 'percent',
            'disk_usage'    => 'percent',
            'network_usage' => 'rx_bytes',
        ];

        $metricName         = $metricNameMap[$metricType] ?? $metricType;
        $metricTypeForQuery = explode('_', $metricType, 2)[0];
        // Look back over the full sustain window (from task creation minus delay),
        // so historical samples within the sustain period are included.
        $windowStartTs = $createdAt - ($delayMs / 1000);
        $since         = \Carbon\Carbon::createFromTimestampUTC(max(0, (int)$windowStartTs));

        $sqlOp = match ($operator) {
            'greater_than_equal' => '>=',
            'less_than'          => '<',
            'less_than_equal'    => '<=',
            'equal'              => '=',
            default              => '>',
        };

        $row = \App\Models\MetricSample::whereHas('batch', fn($q) => $q
            ->where('agent_id', $agent->id)
            ->where('recorded_at', '>=', $since))
            ->where('metric_type', $metricTypeForQuery)
            ->where('metric_name', $metricName)
            ->selectRaw("
                AVG(value) as avg_value,
                COUNT(*) as total,
                SUM(CASE WHEN value {$sqlOp} ? THEN 1 ELSE 0 END) as violating
            ", [$threshold])
            ->first();

        // Fallback: if no samples in specific window, pull recent samples for the metric
        if (!$row || (int)$row->total === 0) {
            $row = \App\Models\MetricSample::whereHas('batch', fn($q) => $q
                ->where('agent_id', $agent->id))
                ->where('metric_type', $metricTypeForQuery)
                ->where('metric_name', $metricName)
                ->selectRaw("
                    AVG(value) as avg_value,
                    COUNT(*) as total,
                    SUM(CASE WHEN value {$sqlOp} ? THEN 1 ELSE 0 END) as violating
                ", [$threshold])
                ->first();
        }

        if ($row && (int)$row->total > 0) {
            $task['live_stats'] = [
                'avg_value'         => round((float)$row->avg_value, 2),
                'total_samples'     => (int)$row->total,
                'violating_samples' => (int)$row->violating,
                'sustain_percent'   => round(((int)$row->violating / (int)$row->total) * 100, 1),
                'threshold'         => (float)$threshold,
                'operator'          => $operator,
            ];
        }

        return $task;
    }

    public static function fireDue(): array
    {
        $store = self::store();
        $index = $store->get(self::INDEX_KEY) ?? [];
        $now = microtime(true);
        $due = [];

        foreach ($index as $taskId => $fireAt) {
            if ($fireAt <= $now) {
                $task = $store->get(self::PREFIX . $taskId);
                if ($task) {
                    $due[] = $task;
                }
                unset($index[$taskId]);
                $store->forget(self::PREFIX . $taskId);
            }
        }

        if (!empty($due)) {
            $store->put(self::INDEX_KEY, $index, self::TTL);
        }

        return $due;
    }

    public static function processDueTasks(): void
    {
        $dueTasks = self::fireDue();

        if (empty($dueTasks)) {
            return;
        }

        $registry = app(NodeRegistry::class);
        $notifications = app(NodeConfigNotificationService::class);

        foreach ($dueTasks as $task) {
            try {
                $config = NodeConfigCache::findById($task['config_id']);
                if (!$config || !$config->enabled) {
                    continue;
                }

                $engine = new NodeConfigEngine($registry);
                $result = $engine->fireTimer($config, $task['node_id'], $task['context'], $task['server_id']);

                if (!$result['success'] || !($result['propagated'] ?? false)) {
                    continue;
                }

                foreach ($result['timers'] ?? [] as $timer) {
                    self::schedule(
                        $timer['node_config_id'],
                        $timer['node_id'],
                        $timer['delay_ms'],
                        array_merge($timer['context'], $task['context']),
                        $task['server_id'],
                    );
                }

                $notifications->dispatchActions($result['actions'] ?? []);

                \App\Events\SystemTelemetryEvent::emit('task_fired', [
                    'task_id'   => $task['task_id'],
                    'config_id' => $task['config_id'],
                    'node_id'   => $task['node_id'],
                    'server_id' => $task['server_id'],
                ]);

                Log::debug("[node-task-scheduler] Fired task", [
                    'task_id'   => $task['task_id'],
                    'config_id' => $task['config_id'],
                    'node_id'   => $task['node_id'],
                    'server_id' => $task['server_id'],
                ]);
            } catch (\Throwable $e) {
                Log::error("[node-task-scheduler] Failed to fire task", [
                    'task_id'   => $task['task_id'] ?? null,
                    'config_id' => $task['config_id'] ?? null,
                    'node_id'   => $task['node_id'] ?? null,
                    'error'     => $e->getMessage(),
                ]);
            }
        }
    }

    private static function generateTaskId(int $configId, string $nodeId, array $context, ?int $serverId): string
    {
        $metricType = $context['metric_type'] ?? '';
        return "{$configId}:{$nodeId}:{$metricType}:{$serverId}";
    }
}
