<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class AgentConfigUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public string $serverUuid;

    public int $heartbeatInterval;

    public string $type;         // 'config_update' | 'binary_update'

    public string $version;      // new agent version

    public string $binaryUrl;    // URL to download new binary (empty for config-only)

    public ?array $portFilter;

    public ?array $processFilter;

    public function __construct(
        string $serverUuid,
        int $heartbeatInterval,
        string $type = 'config_update',
        string $version = '',
        string $binaryUrl = '',
        ?array $portFilter = null,
        ?array $processFilter = null
    ) {
        $this->serverUuid = $serverUuid;
        $this->heartbeatInterval = $heartbeatInterval;
        $this->type = $type;
        $this->version = $version;
        $this->binaryUrl = $binaryUrl;
        $this->portFilter = $portFilter;
        $this->processFilter = $processFilter;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('agent.'.$this->serverUuid),
        ];
    }

    public function broadcastAs(): string
    {
        return 'config.update';
    }

    public function broadcastWith(): array
    {
        return [
            'server_uuid' => $this->serverUuid,
            'type' => $this->type,
            'heartbeat_interval' => $this->heartbeatInterval,
            'version' => $this->version,
            'binary_url' => $this->binaryUrl,
            'port_filter' => $this->portFilter,
            'process_filter' => $this->processFilter,
        ];
    }
}
