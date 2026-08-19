<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class ProvisionTokenGenerated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public string $server_uuid;

    public string $expires_at;

    public function __construct(string $server_uuid, string $expires_at)
    {
        $this->server_uuid = $server_uuid;
        $this->expires_at = $expires_at;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('server.'.$this->server_uuid),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ProvisionTokenGenerated';
    }

    public function broadcastWith(): array
    {
        return [
            'server_uuid' => $this->server_uuid,
            'expires_at' => $this->expires_at,
        ];
    }
}
