<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Support\Facades\Cache;

class DashboardUsageBroadcast implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public array $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('dashboard'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'DashboardUsageBroadcast';
    }

    public function broadcastWith(): array
    {
        return $this->data;
    }

    public static function dispatchSync(array $data): ?self
    {
        $lockKey = 'dashboard_usage_broadcast_at';
        $last = Cache::get($lockKey);

        if ($last && microtime(true) - $last < 5) {
            return null;
        }

        Cache::put($lockKey, microtime(true), 10);

        $event = new self($data);
        broadcast($event);

        return $event;
    }
}
