<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class ServerStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public string $serverUuid;

    public string $status;

    public ?string $serverName;

    public function __construct(string $serverUuid, string $status, ?string $serverName = null)
    {
        $this->serverUuid = $serverUuid;
        $this->status = $status;
        $this->serverName = $serverName;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('server.'.$this->serverUuid),
            new PrivateChannel('dashboard'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ServerStatusUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'server_uuid' => $this->serverUuid,
            'status' => $this->status,
            'server_name' => $this->serverName,
            'timestamp' => now()->timestamp,
        ];
    }
}
