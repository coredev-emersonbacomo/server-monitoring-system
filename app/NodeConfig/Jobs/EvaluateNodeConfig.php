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

    public function handle(NodeRegistry $registry): void
    {
        $config = NodeConfig::find($this->configId);
        if (!$config || !$config->enabled) {
            return;
        }

        $engine = new NodeConfigEngine($registry);
        $result = $engine->trigger($config, $this->sourceNodeId, $this->value, $this->extraState);

        if (!$result['success']) {
            return;
        }

        // Schedule timers
        foreach ($result['timers'] as $timer) {
            FireNodeTimer::dispatch(
                $timer['node_config_id'],
                $timer['node_id'],
                $timer['context'],
            )->delay(now()->addMilliseconds($timer['delay_ms']));
        }

        // Dispatch actions
        foreach ($result['actions'] as $action) {
            $this->dispatchAction($action);
        }
    }

    private function dispatchAction(array $action): void
    {
        $settings = $action['settings'];
        $context = $action['upstream_context'] ?? [];

        $templateVars = [
            'runtime.metricName' => $context['metric_name'] ?? 'Unknown Metric',
            'runtime.sustainValue' => $context['sustain_value'] ?? '',
        ];

        $subject = $this->resolveTemplates($settings['subject'] ?? 'Alert triggered', $templateVars);
        $message = $this->resolveTemplates($settings['message'] ?? 'An alert condition was triggered.', $templateVars);

        \Illuminate\Support\Facades\Log::info('Node config action triggered', [
            'type' => $action['type'],
            'node_id' => $action['node_id'],
            'channel' => $settings['channel'] ?? 'email',
            'subject' => $subject,
            'message' => $message,
            'upstream_context' => $context,
        ]);
    }

    private function resolveTemplates(string $text, array $vars): string
    {
        return preg_replace_callback('/\{([^}]+)\}/', function ($matches) use ($vars) {
            $key = $matches[1];
            return $vars[$key] ?? $matches[0];
        }, $text);
    }
}
