<?php

namespace App\NodeConfig\Services;

use App\NodeConfig\Models\NodeConfig;
use Illuminate\Support\Facades\Auth;

class NodeConfigService
{
    public function copyGlobalConfigIfNeeded(string $scopeType, string $targetSlug): void
    {
        if (! in_array($scopeType, ['client', 'server'])) {
            return;
        }

        $targetConfig = NodeConfig::firstOrCreate(
            ['slug' => $targetSlug],
            [
                'scope_type' => $scopeType,
                'scope_id' => match ($scopeType) {
                    'client' => substr($targetSlug, 7),
                    'server' => substr($targetSlug, 7),
                    default => null,
                },
                'name' => '',
                'config' => ['nodes' => [], 'edges' => []],
                'created_by' => Auth::id(),
            ],
        );

        $nodes = $targetConfig->config['nodes'] ?? [];
        if (! empty($nodes)) {
            return;
        }

        $globalConfig = NodeConfig::where('scope_type', 'global')->first();
        if (! $globalConfig || empty($globalConfig->config['nodes'] ?? [])) {
            return;
        }

        // compileAndStore is triggered by model saved event
        $targetConfig->update([
            'config' => $globalConfig->config,
        ]);
    }
}
