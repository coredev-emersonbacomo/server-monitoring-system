<?php

namespace App\Jobs;

use App\Events\ServerStatsUpdated;
use App\Models\Server;
use App\Http\Controllers\ServerController;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

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
        if (!$server) return;

        $rows = $server->updates()
            ->orderByDesc('created_at')
            ->limit(2)
            ->get();

        $latest = $rows->first();
        $prev   = $rows->count() > 1 ? $rows->last() : null;

        if (!$latest) return;

        $stats = ServerController::computeStatPointPublic($latest, $prev);

        $broadcast = [
            't' => $stats['timestamp'],
            'c' => $stats['cpu'],
            'm' => $stats['memory'],
            'i' => $stats['netIn'],
            'o' => $stats['netOut'],
            'd' => $stats['disk'],
        ];

        ServerStatsUpdated::dispatchSync($this->serverUuid, $broadcast);

        BroadcastDashboardUsage::dispatch();
    }
}
