<?php

namespace App\NodeConfig\Jobs;

use App\NodeConfig\Cache\NodeConfigCache;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Engine\NodeTaskScheduler;
use App\NodeConfig\Services\NodeConfigNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class EvaluateNodeConfig implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 30;

    public function __construct(
        private readonly int $configId,
        private readonly string $sourceNodeId,
        private readonly mixed $value,
        private readonly array $extraState = [],
    ) {}

    public function handle(NodeRegistry $registry, NodeConfigNotificationService $notifications): void
    {
        $config = NodeConfigCache::findById($this->configId);
        if (! $config) {
            return;
        }

        $serverId = $this->extraState['server_id'] ?? null;

        $engine = new NodeConfigEngine($registry);
        $result = $engine->trigger($config, $this->sourceNodeId, $this->value, $this->extraState, $serverId);

        if (! $result['success']) {
            return;
        }

        foreach ($result['timers'] as $timer) {
            NodeTaskScheduler::schedule(
                $timer['node_config_id'],
                $timer['node_id'],
                $timer['delay_ms'],
                array_merge($timer['context'], $this->extraState),
                $serverId,
            );
        }

        $notifications->dispatchActions($result['actions']);
    }
}
