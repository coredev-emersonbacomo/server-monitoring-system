<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AgentLifecycleEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'server_id' => $this->server_id,
            'server_uuid' => $this->server?->uuid,
            'server_name' => $this->server?->name,
            'agent_servers' => $this->agent?->monitoredServers?->map(
                fn ($s) => ['uuid' => $s->uuid, 'name' => $s->name],
            )?->values()->all() ?? [],
            'agent_id' => $this->agent_id,
            'event_type' => $this->event_type,
            'occurred_at' => $this->occurred_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
