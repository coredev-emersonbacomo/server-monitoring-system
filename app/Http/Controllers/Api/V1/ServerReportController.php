<?php

namespace App\Http\Controllers;

use App\Data\ServerMetricPointData;
use App\Data\ServerReportData;
use App\Data\ServerUptimeData;
use App\Models\Server;
use Illuminate\Http\Request;

class ServerReportController extends Controller
{
    private const HEARTBEAT_INTERVAL_MINUTES = 5;
    private const GAP_MULTIPLIER = 3; // gap > 3x interval = treated as an outage

    public function show(Request $request, Server $server)
    {
        $range = $request->integer('hours', 24);

        $updates = $server->serverUpdates()
            ->where('created_at', '>=', now()->subHours($range))
            ->orderBy('created_at')
            ->get();

        $metrics = $updates->map(fn($u) => ServerMetricPointData::from([
            'timestamp' => $u->created_at->toIso8601String(),
            'cpu_usage' => $u->cpu_usage,
            'memory_usage' => $u->memory_usage,
            'disk_usage' => $u->disk_usage,
            'network_rbytes' => $u->network_rbytes,
            'network_tbytes' => $u->network_tbytes,
        ]));

        $uptime = $this->buildUptime($server, $updates, $range);

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

        return ServerReportData::from([
            'uuid' => $server->uuid,
            'name' => $server->name,
            'description' => $server->description,
            'client_name' => $server->client?->name,
            'host_name' => $server->host_name,
            'cpu_model' => $server->cpu_model,
            'cpu_cores' => $server->cpu_cores,
            'ram' => $server->ram,
            'disk' => $server->disk,
            'operating_system' => $server->operating_system,
            'status' => $server->status,
            'record_status' => $server->record_status?->value ?? 'active',
            'last_seen' => $server->agent?->last_seen_at?->toIso8601String(),
            'metrics' => $metrics,
            'uptime' => $uptime,
            'running_balance'  => (float) ($server->running_balance ?? 0.0),
            'net_cost'         => (float) ($server->net_cost ?? 0.0),
            'accumulated_cost' => (float) ($server->accumulated_cost ?? 0.0),
            'billing_date' => $server->billing_date?->toIso8601String(),
            'activities' => $activities,
        ]);
    }

    private function buildUptime(Server $server, $updates, int $rangeHours): ServerUptimeData
    {
        $gapThreshold = self::HEARTBEAT_INTERVAL_MINUTES * self::GAP_MULTIPLIER;
        $outageMinutes = 0;
        $outageCount = 0;
        $lastDowntime = null;

        if ($updates->isNotEmpty()) {
            $prev = $updates->first()->created_at;
            foreach ($updates->skip(1) as $update) {
                $gap = $prev->diffInMinutes($update->created_at);
                if ($gap > $gapThreshold) {
                    $outageMinutes += $gap;
                    $outageCount++;
                    $lastDowntime = $update->created_at->toIso8601String();
                }
                $prev = $update->created_at;
            }
        }

        $totalMinutes = $rangeHours * 60;
        $uptimePercentage = $totalMinutes > 0
            ? round((($totalMinutes - $outageMinutes) / $totalMinutes) * 100, 2)
            : 0;

        return ServerUptimeData::from([
            'uptime_seconds' => $server->uptime_seconds ?? 0,
            'uptime_percentage' => max(0, min(100, $uptimePercentage)),
            'outage_count' => $outageCount,
            'last_downtime' => $lastDowntime,
        ]);
    }
}