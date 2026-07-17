<?php

namespace App\NodeConfig\Jobs;

use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\Services\NodeConfigNotificationService;
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

    public function handle(NodeRegistry $registry, NodeConfigNotificationService $notifications): void
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

        foreach ($result['timers'] ?? [] as $timer) {
            FireNodeTimer::dispatch(
                $timer['node_config_id'],
                $timer['node_id'],
                array_merge($timer['context'], $this->context),
            )->delay(now()->addMilliseconds($timer['delay_ms']));
        }

        $notifications->dispatchActions($result['actions'] ?? []);
    }
}
