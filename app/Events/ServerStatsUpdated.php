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

    /**
     * The payload that will be sent to the frontend.
     * In a real app, this might be an array of Coop objects or a specific Server.
     */
    public array $coops;

    public function __construct(array $coops)
    {
        $this->coops = $coops;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Broadcasts to the public 'dashboard' channel. 
        // Use PrivateChannel('dashboard') if you want to restrict it to authenticated users only.
        return [
            new PrivateChannel('dashboard'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'ServerStatsUpdated';
    }
}
