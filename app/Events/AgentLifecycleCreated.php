<?php

namespace App\Events;

use App\Http\Resources\AgentLifecycleEventResource;
use App\Models\AgentLifecycleEvent;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Http\Request;

class AgentLifecycleCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public AgentLifecycleEvent $event) {}

    public function broadcastOn(): array
    {
        $channels = [];
        if ($this->event->server) {
            $channels[] = new PrivateChannel('server.'.$this->event->server->uuid);
        } else {
            foreach ($this->event->agent->monitoredServers as $server) {
                $channels[] = new PrivateChannel('server.'.$server->uuid);
            }
            if (empty($channels)) {
                return [];
            }
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'AgentLifecycleCreated';
    }

    public function broadcastWith(): array
    {
        $req = request() ?? new Request;

        return (new AgentLifecycleEventResource($this->event->load(['server', 'agent', 'agent.monitoredServers'])))->toArray($req);
    }
}
