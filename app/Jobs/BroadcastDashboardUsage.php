<?php

namespace App\Jobs;

use App\Events\DashboardUsageBroadcast;
use App\Models\Server;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BroadcastDashboardUsage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 10;

    public function handle(): void
    {
        $lock = Cache::lock('dashboard_usage_broadcast_lock', 5);
        if (! $lock->get()) {
            return;
        }

        try {
            $this->broadcast();
        } finally {
            $lock->release();
        }
    }

    private function broadcast(): void
    {
        $servers = Server::with('client', 'latestUpdate')->get();
        $serverIds = $servers->pluck('id');

        if ($serverIds->isEmpty()) {
            return;
        }

        $startTime = now()->subSeconds(3600);
        $divisor = 60;
        $column = 'cpu_usage';

        $driver = DB::connection()->getDriverName();
        $epochExpr = $driver === 'mysql'
            ? 'UNIX_TIMESTAMP(created_at)'
            : 'EXTRACT(EPOCH FROM created_at)';

        $bucketExpr = "FLOOR({$epochExpr} / {$divisor}) * {$divisor} * 1000";

        $rows = DB::table('server_updates')
            ->select(
                'server_id',
                DB::raw("{$bucketExpr} AS bucket_ts"),
                DB::raw("AVG({$column}) AS avg_value"),
            )
            ->whereIn('server_id', $serverIds)
            ->where('created_at', '>=', $startTime)
            ->groupBy('server_id', DB::raw($bucketExpr))
            ->orderBy('server_id')
            ->orderBy('bucket_ts')
            ->get();

        $seriesMap = [];
        foreach ($rows as $row) {
            $seriesMap[$row->server_id][] = [
                'timestamp' => (int) $row->bucket_ts,
                'value' => round((float) $row->avg_value, 1),
            ];
        }

        $endTime = $startTime->copy()->addSeconds(3600);
        $startBucket = (int) (floor($startTime->timestamp / $divisor) * $divisor);
        $endBucket = (int) (floor($endTime->timestamp / $divisor) * $divisor);
        $buckets = [];
        for ($ts = $startBucket; $ts <= $endBucket; $ts += $divisor) {
            $buckets[] = $ts * 1000;
        }

        $series = [];
        $top = [];

        foreach ($servers as $server) {
            if (! $server->latestUpdate) {
                continue;
            }

            $raw = $seriesMap[$server->id] ?? [];
            $indexed = [];
            foreach ($raw as $p) {
                $indexed[$p['timestamp']] = $p['value'];
            }

            $points = [];
            foreach ($buckets as $bt) {
                $points[] = [
                    'timestamp' => $bt,
                    'value' => $indexed[$bt] ?? null,
                ];
            }

            $series[] = [
                'server_uuid' => $server->uuid,
                'server_name' => $server->name,
                'client_name' => $server->client->name,
                'points' => $points,
            ];

            $top[] = [
                'server_uuid' => $server->uuid,
                'server_name' => $server->name,
                'client_name' => $server->client->name,
                'value' => round((float) $server->latestUpdate->{$column}, 1),
            ];
        }

        usort($top, fn ($a, $b) => $b['value'] <=> $a['value']);

        try {
            DashboardUsageBroadcast::dispatchSync([
                'unit' => 'minute',
                'metric' => 'cpu',
                'series' => $series,
                'top' => $top,
            ]);
        } catch (\Throwable $e) {
            Log::warning('[broadcast] Failed to broadcast dashboard usage', ['error' => $e->getMessage()]);
        }
    }
}
