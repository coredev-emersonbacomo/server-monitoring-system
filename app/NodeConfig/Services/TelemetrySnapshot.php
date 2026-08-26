<?php

namespace App\NodeConfig\Services;

use App\NodeConfig\Engine\NodeTaskScheduler;
use App\NodeConfig\Models\NodeConfigState;
use Illuminate\Support\Facades\Cache;

/**
 * Builds the payloads for the alert System Pipeline & Telemetry Visualizer.
 *
 * The HTTP response keeps full data; the broadcast payload is trimmed to stay
 * under the realtime transport's per-message size limit.
 */
class TelemetrySnapshot
{
    public function build(): array
    {
        $activeTasks = array_values(NodeTaskScheduler::getAllActiveTasks());
        $states = NodeConfigState::all();
        $serverNow = microtime(true);
        $lastSweepAt = Cache::get('last_monitor_sweep_at');

        $broadcastStates = $states->map(fn ($s) => [
            'node_id' => $s->node_id,
            'server_id' => $s->server_id,
            'output_value' => $s->output_value,
        ])->values();

        $broadcastTasks = array_values(array_map(fn ($t) => [
            'task_id' => $t['task_id'],
            'node_id' => $t['node_id'],
            'server_id' => $t['server_id'],
            'fire_at' => $t['fire_at'],
            'delay_ms' => $t['delay_ms'],
            'live_stats' => $t['live_stats'] ?? null,
            'context' => [
                'chain_steps_meta' => $t['context']['chain_steps_meta'] ?? null,
                'repeat_count' => $t['context']['repeat_count'] ?? 0,
                'repeat_fire' => $t['context']['repeat_fire'] ?? false,
                'metric_type' => $t['context']['metric_type'] ?? null,
            ],
        ], $activeTasks));

        return [
            'http' => [
                'server_now' => $serverNow,
                'active_tasks' => $activeTasks,
                'states' => $states,
                'last_monitor_sweep_at' => $lastSweepAt,
                'monitor_interval_seconds' => 60,
            ],
            'broadcast' => [
                'server_now' => $serverNow,
                'active_tasks' => $broadcastTasks,
                'states' => $broadcastStates,
                'last_monitor_sweep_at' => $lastSweepAt,
                'monitor_interval_seconds' => 60,
            ],
        ];
    }
}
