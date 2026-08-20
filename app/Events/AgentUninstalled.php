<?php

namespace App\Events;

use App\Enums\ServerStatus;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class AgentUninstalled implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public string $server_uuid;

    public function __construct(string $server_uuid)
    {
        $this->server_uuid = $server_uuid;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('server.'.$this->server_uuid),
        ];
    }

    public function broadcastAs(): string
    {
        return 'AgentUninstalled';
    }

    public function broadcastWith(): array
    {
        return [
            'server_uuid' => $this->server_uuid,
            'agent_deleted' => true,
            'status' => ServerStatus::AgentUninstalled->value,
        ];
    }
}
