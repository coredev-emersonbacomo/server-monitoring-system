<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ServerStatsUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $server_id;
    public array $stats;

    public function __construct(int $server_id, array $stats)
    {
        $this->server_id = $server_id;
        $this->stats = $stats;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('server.' . $this->server_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ServerStatsUpdated';
    }
}
