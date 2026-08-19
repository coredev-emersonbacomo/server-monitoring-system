<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ServerStatsUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public string $server_uuid;

    public array $stats;

    public function __construct(string $server_uuid, array $stats)
    {
        $this->server_uuid = $server_uuid;
        $this->stats = $stats;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('server.'.$this->server_uuid),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ServerStatsUpdated';
    }

    public function broadcastWith(): array
    {
        return $this->stats;
    }

    public static function dispatchSync(string $serverUuid, array $stats): ?self
    {
        $last = Cache::get("broadcast:last:{$serverUuid}");

        if ($last) {
            $thresholds = ['c' => 0.5, 'm' => 1.0, 'd' => 1.0];
            $changed = false;
            foreach ($thresholds as $key => $threshold) {
                if (abs(($stats[$key] ?? 0) - ($last[$key] ?? 0)) >= $threshold) {
                    $changed = true;
                    break;
                }
            }
            if (! $changed) {
                return null;
            }
        }

        Cache::put("broadcast:last:{$serverUuid}", $stats, 3600);

        $event = new self($serverUuid, $stats);
        try {
            broadcast($event);
        } catch (\Throwable $e) {
            Log::warning('[broadcast] ServerStatsUpdated broadcast failed', ['error' => $e->getMessage()]);
        }

        return $event;
    }
}
