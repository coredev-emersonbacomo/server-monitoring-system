<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WatchedPathResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'path' => $this->path,
            'scope' => $this->scope,
            'server_id' => $this->server_id,
            'server_uuid' => $this->server?->uuid,
            'enabled' => $this->enabled,
            'recursive' => $this->recursive,
            'exclude_patterns' => $this->exclude_patterns ?? [],
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
