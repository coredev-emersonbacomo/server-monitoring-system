<?php

namespace App\Jobs;

use App\Events\ServerStatsUpdated;
use App\Http\Controllers\Api\V1\ServerController;
use App\Models\Server;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
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
        ];

        try {
            ServerStatsUpdated::dispatchSync($this->serverUuid, $broadcast);
        } catch (\Throwable $e) {
            Log::warning('[broadcast] Failed to push stats update in job', ['error' => $e->getMessage()]);
        }

        BroadcastDashboardUsage::dispatch();
    }
}
