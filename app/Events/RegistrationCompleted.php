<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class RegistrationCompleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public string $server_uuid;

    public int $agent_id;

    public function __construct(string $server_uuid, int $agent_id)
    {
        $this->server_uuid = $server_uuid;
        $this->agent_id = $agent_id;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('server.'.$this->server_uuid),
            new PrivateChannel('dashboard'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'RegistrationCompleted';
    }

    public function broadcastWith(): array
    {
        return [
            'server_uuid' => $this->server_uuid,
            'agent_id' => $this->agent_id,
            'status' => 'waiting_for_first_heartbeat',
        ];
    }
}
