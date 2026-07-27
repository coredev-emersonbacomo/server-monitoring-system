<?php

namespace App\NodeConfig\Services;

use App\Models\Server;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class NodeConfigNotificationService
{
    public function __construct(
        private NotificationService $notifications,
    ) {}

    public function dispatchActions(array $actions): void
    {
        foreach ($actions as $action) {
            $this->dispatchAction($action);
        }
    }

    public function dispatchAction(array $action): void
    {
        $settings = $action['settings'];
        $context = $action['upstream_context'] ?? [];

        $serverId = $context['server_id'] ?? null;
        $server = $serverId ? Server::with('client.secopclients')->find($serverId) : null;

        $templateData = [
            'server' => $server,
            'runtime' => [
                'metricName' => $context['metric_name'] ?? 'Unknown Metric',
                'sustainValue' => $context['sustain_value'] ?? '',
                'timestamp' => now()->format('Y-m-d H:i:s'),
                'offlineDuration' => $server?->agent?->last_seen_at
                    ? now()->diffForHumans($server->agent->last_seen_at, true) . ' ago'
                    : 'unknown',
            ],
        ];

        $subject = $this->resolveTemplates($settings['subject'] ?? 'Alert triggered', $templateData);
        $message = $this->resolveTemplates($settings['message'] ?? 'An alert condition was triggered.', $templateData);

        $channel = $settings['channel'] ?? 'email';

        try {
            match ($channel) {
                'email' => $this->sendEmail($server, $subject, $message),
                'discord' => $this->sendDiscord($settings, $message),
                default => null,
            };

            Log::info("[server-events] Notification dispatched", [
                'server_id' => $serverId,
                'server' => $server?->name,
                'channel' => $channel,
                'subject' => $subject,
                'node' => $action['node_id'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::error("[server-events] Notification failed", [
                'server_id' => $serverId,
                'server' => $server?->name,
                'channel' => $channel,
                'error' => $e->getMessage(),
                'node_id' => $action['node_id'] ?? null,
            ]);
        }
    }

    private function sendEmail(?Server $server, string $subject, string $message): void
    {
        $emails = $server?->client?->secopclients?->pluck('email')->filter()->values()->all();
        if (empty($emails)) return;

        $this->notifications->sendEmailAlert($emails, $message, $subject);
    }

    private function sendDiscord(array $settings, string $message): void
    {
        $botToken = $settings['bot_token'] ?? null;
        $channelId = $settings['channel_id'] ?? null;
        $roleId = $settings['role_id'] ?? null;

        if (!$botToken || !$channelId) return;

        $this->notifications->sendDiscordAlert($botToken, $roleId ?? '', $message, $channelId);
    }

    public function resolveTemplates(string $text, array $data): string
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
