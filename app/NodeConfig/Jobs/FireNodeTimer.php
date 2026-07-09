<?php

namespace App\NodeConfig\Jobs;

use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Models\NodeConfig;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class FireNodeTimer implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 30;

    public function __construct(
        private readonly int $configId,
        private readonly string $nodeId,
        private readonly array $context = [],
    ) {}

    public function handle(NodeRegistry $registry): void
    {
        $config = NodeConfig::find($this->configId);
        if (!$config || !$config->enabled) {
            return;
        }

        $engine = new NodeConfigEngine($registry);
        $result = $engine->fireTimer($config, $this->nodeId, $this->context);

        if (!$result['success'] || !($result['propagated'] ?? false)) {
            return;
        }

        // Schedule downstream timers
        foreach ($result['timers'] ?? [] as $timer) {
            FireNodeTimer::dispatch(
                $timer['node_config_id'],
                $timer['node_id'],
                $timer['context'],
            )->delay(now()->addMilliseconds($timer['delay_ms']));
        }

        // Dispatch downstream actions
        foreach ($result['actions'] ?? [] as $action) {
            \Illuminate\Support\Facades\Log::info('Node config action triggered', [
                'type' => $action['type'],
                'node_id' => $action['node_id'],
                'settings' => $action['settings'],
            ]);
        }
    }
}
