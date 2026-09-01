<?php

namespace App\Events;

use App\Http\Resources\FileActivityLogResource;
use App\Models\FileActivityLog;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Http\Request;

class FileActivityCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public FileActivityLog $log) {}

    public function broadcastOn(): array
    {
        $channels = [];
        if ($this->log->server) {
            $channels[] = new PrivateChannel('server.'.$this->log->server->uuid);
        } else {
            // agent-scoped: broadcast to every server the agent currently monitors
            foreach ($this->log->agent->monitoredServers as $server) {
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
        return 'FileActivityCreated';
    }

    public function broadcastWith(): array
    {
        $req = request() ?? new Request;

        return (new FileActivityLogResource($this->log->load(['server', 'agent', 'agent.monitoredServers'])))->toArray($req);
    }
}
