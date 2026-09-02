<?php

namespace App\Services;

use App\Models\FileActivityLog;
use App\Models\Heartbeat;
use App\Models\MetricBatch;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class AgentDataCleanupService
{
    /**
     * Retention period in days for high-volume, low-retention data.
     */
    public static function retentionDays(): int
    {
        return (int) Setting::get('agent_log_retention_days', 60);
    }

    /**
     * Delete high-volume, low-retention rows older than the cutoff: agent
     * heartbeats, their associated metric batches/samples (via cascade), and
     * file activity events. Timed metrics (server_updates / server_network_stats)
     * live in TimescaleDB hypertables already governed by their own retention
     * policies, and long-term records (agent logs, CRUD, install/uninstall) are
     * intentionally kept.
     */
    public function cleanup(): array
    {
        $retentionDays = static::retentionDays();
        $cutoff = now()->subDays($retentionDays);

        $heartbeats = Heartbeat::where('received_at', '<', $cutoff)->delete();

        // Metric batches (and their samples, via cascade) age alongside
        // heartbeats — delete them too, so deleting heartbeats doesn't orphan
        // the batch/sample growth.
        $metricBatches = MetricBatch::where('created_at', '<', $cutoff)->delete();

        // File activity events are high-volume and not meaningful long-term.
        $fileActivity = FileActivityLog::where('occurred_at', '<', $cutoff)->delete();

        $counts = [
            'heartbeats' => $heartbeats,
            'metric_batches' => $metricBatches,
            'file_activity' => $fileActivity,
        ];

        Log::info('Agent data cleanup complete', [
            'retention_days' => $retentionDays,
            'cutoff' => $cutoff->toIso8601String(),
            'counts' => $counts,
        ]);

        return $counts;
    }
}
