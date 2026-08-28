<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Support\Facades\Log;

class SystemTelemetryEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public string $type;

    public array $payload;

    public function __construct(string $type, array $payload)
    {
        $this->type = $type;
        $this->payload = array_merge($payload, [
            'timestamp' => microtime(true),
        ]);
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('system-telemetry'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'SystemTelemetryEvent';
    }

    public function broadcastWith(): array
    {
        return [
            'type' => $this->type,
            'payload' => $this->payload,
        ];
    }

    public static function emit(string $type, array $payload): void
    {
        // single toggle point — when the visual debugger is off, no
        // backend path (heartbeat, scheduler, sweeps) pushes telemetry at all.
        if (! config('telemetry.enabled')) {
            return;
        }

        try {
            broadcast(new self($type, $payload));
        } catch (\Throwable $e) {
            Log::warning('[telemetry] Broadcast failed', ['error' => $e->getMessage()]);
        }
    }
}
