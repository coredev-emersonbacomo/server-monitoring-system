<?php

namespace App\Jobs;

use App\Events\ServerStatsUpdated;
use App\Http\Controllers\Api\V1\ServerController;
use App\Models\Server;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BroadcastServerStats implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 5;

    public function __construct(
        private readonly int $serverId,
        private readonly string $serverUuid,
    ) {}

    public function handle(): void
    {
        $server = Server::find($this->serverId);
        if (! $server) {
            return;
        }

        $rows = $server->updates()
            ->orderByDesc('created_at')
            ->limit(2)
            ->get();

        $latest = $rows->first();
        $prev = $rows->count() > 1 ? $rows->last() : null;

        if (! $latest) {
            return;
        }

        $stats = ServerController::computeStatPointPublic($latest, $prev);

        $broadcast = [
            't' => $stats['timestamp'],
            'c' => $stats['cpu'],
            'm' => $stats['memory'],
            'i' => $stats['netIn'],
            'o' => $stats['netOut'],
            'd' => $stats['disk'],
            'n' => self::liveNetworks($this->serverId),
        ];

        try {
            ServerStatsUpdated::dispatchSync($this->serverUuid, $broadcast);
        } catch (\Throwable $e) {
            Log::warning('[broadcast] Failed to push stats update in job', ['error' => $e->getMessage()]);
        }

        BroadcastDashboardUsage::dispatch();
    }

    /**
     * Live per-interface snapshot for the Network Traffic chart: latest two
     * raw rows per interface, rate = counter delta / dt (MB/s), clamped at 0
     * on counter resets. Type/state travel from the newest row.
     *
     * @return array<int, array{name: string, type: string, state: string, i: float, o: float}>
     */
    private static function liveNetworks(int $serverId): array
    {
        $rows = collect(DB::select("
            SELECT interface_name, interface_type, oper_state, rx_bytes, tx_bytes, created_at, rn
            FROM (
                SELECT interface_name, interface_type, oper_state, rx_bytes, tx_bytes, created_at,
                       ROW_NUMBER() OVER (PARTITION BY interface_name ORDER BY created_at DESC) AS rn
                FROM server_network_stats
                WHERE server_id = ? AND created_at >= NOW() - INTERVAL '5 minutes'
            ) ranked
            WHERE rn <= 2
        ", [$serverId]));

        return $rows->groupBy('interface_name')->map(function ($ifaceRows) {
            $latest = $ifaceRows->firstWhere('rn', 1);
            if (! $latest) {
                return null;
            }

            $in = 0.0;
            $out = 0.0;
            $prev = $ifaceRows->firstWhere('rn', 2);
            if ($prev) {
                $dt = (Carbon::parse($latest->created_at)->getPreciseTimestamp(3) - Carbon::parse($prev->created_at)->getPreciseTimestamp(3)) / 1000;
                if ($dt > 0) {
                    $in = max(0, (($latest->rx_bytes - $prev->rx_bytes) / 1_000_000) / $dt);
                    $out = max(0, (($latest->tx_bytes - $prev->tx_bytes) / 1_000_000) / $dt);
                }
            }

            return [
                'name' => (string) $latest->interface_name,
                'type' => (string) $latest->interface_type,
                'state' => (string) $latest->oper_state,
                'i' => round($in, 2),
                'o' => round($out, 2),
            ];
        })->filter()->values()->all();
    }
}
