<?php

namespace App\NodeConfig\Jobs;

use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Models\NodeConfig;
use App\Models\Server;
use App\Services\NotificationService;
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

    public function handle(NodeRegistry $registry, NotificationService $notifications): void
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

        foreach ($result['timers'] as $timer) {
            FireNodeTimer::dispatch(
                $timer['node_config_id'],
                $timer['node_id'],
                array_merge($timer['context'], $this->extraState),
            )->delay(now()->addMilliseconds($timer['delay_ms']));
        }

        foreach ($result['actions'] as $action) {
            $this->dispatchAction($action, $notifications);
        }
    }

    private function dispatchAction(array $action, NotificationService $notifications): void
    {
        $settings = $action['settings'];
        $context = $action['upstream_context'] ?? [];

        $serverId = $context['server_id'] ?? null;
        $server = $serverId ? Server::with('client')->find($serverId) : null;

        $templateData = [
            'server' => $server,
            'runtime' => [
                'metricName' => $context['metric_name'] ?? 'Unknown Metric',
                'sustainValue' => $context['sustain_value'] ?? '',
            ],
        ];

        $subject = $this->resolveTemplates($settings['subject'] ?? 'Alert triggered', $templateData);
        $message = $this->resolveTemplates($settings['message'] ?? 'An alert condition was triggered.', $templateData);

        $channel = $settings['channel'] ?? 'email';

        try {
            match ($channel) {
                'email' => $this->sendEmail($server, $subject, $message, $notifications),
                'discord' => $this->sendDiscord($settings, $message, $notifications),
                default => null,
            };
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('NodeConfig: failed to dispatch notification', [
                'channel' => $channel,
                'error' => $e->getMessage(),
                'node_id' => $action['node_id'],
            ]);
        }
    }

    private function sendEmail(?Server $server, string $subject, string $message, NotificationService $notifications): void
    {
        $email = $server?->client?->email;
        if (!$email) return;

        $notifications->sendEmailAlert($email, $message, $subject);
    }

    private function sendDiscord(array $settings, string $message, NotificationService $notifications): void
    {
        $botToken = $settings['bot_token'] ?? null;
        $channelId = $settings['channel_id'] ?? null;
        $roleId = $settings['role_id'] ?? null;

        if (!$botToken || !$channelId) return;

        $notifications->sendDiscordAlert($botToken, $roleId ?? '', $message, $channelId);
    }

    private function resolveTemplates(string $text, array $data): string
    {
        return preg_replace_callback('/\{([^}]+)\}/', function ($matches) use ($data) {
            return $this->resolveTemplateVar($matches[1], $data);
        }, $text);
    }

    private function resolveTemplateVar(string $path, array $data): string
    {
        $allowedPrefixes = ['server', 'runtime'];

        if ($path === '' || !preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$/', $path)) {
            return '{' . $path . '}';
        }

        $firstSegment = strtolower(explode('.', $path)[0]);

        if (!in_array($firstSegment, $allowedPrefixes, true)) {
            return '{' . $path . '}';
        }

        $result = data_get($data, $path);

        return $result !== null ? (string) $result : '{' . $path . '}';
    }
}
