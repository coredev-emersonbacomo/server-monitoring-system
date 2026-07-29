<?php

namespace App\NodeConfig\Services;

use App\Models\Server;
use App\Services\NotificationService;
use Carbon\Carbon;
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

        $firstTriggerTs = isset($context['first_trigger_timestamp'])
            ? Carbon::parse($context['first_trigger_timestamp'])->format('Y-m-d H:i:s')
            : now()->format('Y-m-d H:i:s');

        $repeatCount = (int) ($context['repeat_count'] ?? 0);
        $isRepeat = ($context['repeat_fire'] ?? false) === true || $repeatCount > 0;

        $templateData = [
            'server' => $server,
            'runtime' => [
                'metricName' => $context['metric_name'] ?? 'Unknown Metric',
                'sustainValue' => $context['sustain_value'] ?? '',
                'eventTimestamp' => now()->format('Y-m-d H:i:s'),
                'firstTriggerTimestamp' => $firstTriggerTs,
                'offlineTimestamp' => $context['offlineTimestamp']
                    ?? $server?->went_offline_at?->format('Y-m-d H:i:s')
                    ?? now()->format('Y-m-d H:i:s'),
                'offlineDuration' => $server?->went_offline_at
                    ? $server->went_offline_at->diffForHumans(now(), true)
                    : ($server?->agent?->last_seen_at
                        ? now()->diffForHumans($server->agent->last_seen_at, true) . ' ago'
                        : 'unknown'),
                'repeat' => [
                    'interval' => $context['repeat_interval'] ?? '',
                    'countOfMessage' => $repeatCount,
                    'max' => (int) ($context['repeat_max'] ?? 0),
                ],
            ],
        ];

        $subject = $this->resolveTemplates($settings['subject'] ?? 'Alert triggered', $templateData);
        $message = $this->resolveTemplates($settings['message'] ?? '', $templateData);

        // Parse <if-repeat> conditionals
        if (!$isRepeat) {
            $message = preg_replace('/<if-repeat>.*?<\/if-repeat>/s', '', $message);
        } else {
            $message = preg_replace('/<\/?if-repeat>/', '', $message);
        }

        $message = trim($message);

        // Skip if message is empty
        if ($message === '' && $channel !== 'discord') {
            return;
        }

        $channel = $settings['channel'] ?? 'email';

        $serverUrl = $server ? url('/servers/' . $server->uuid) : null;

        try {
            match ($channel) {
                'email' => $message !== '' ? $this->sendEmail($server, $subject, $message, $serverUrl) : null,
                'discord' => $this->sendDiscord($settings, $message, $serverUrl),
                default => null,
            };

            Log::info("[server-events] Notification dispatched", [
                'server_id' => $serverId,
                'server' => $server?->name,
                'channel' => $channel,
                'subject' => $subject,
                'node' => $action['node_id'] ?? null,
            ]);

            \App\Events\SystemTelemetryEvent::emit('notification_dispatched', [
                'server_id'   => $serverId,
                'server_name' => $server?->name,
                'channel'     => $channel,
                'subject'     => $subject,
                'node_id'     => $action['node_id'] ?? null,
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

    private function sendEmail(?Server $server, string $subject, string $message, ?string $url = null): void
    {
        $emails = $server?->client?->secopclients?->pluck('email')->filter()->values()->all();
        if (empty($emails)) return;

        $this->notifications->sendEmailAlert($emails, $message, $subject, $url);
    }

    private function sendDiscord(array $settings, string $message, ?string $url = null, ?string $subject = null): void
    {
        $botToken = $settings['bot_token'] ?? null;
        $channelId = $settings['channel_id'] ?? null;
        $roleId = $settings['role_id'] ?? null;

        if (!$botToken || !$channelId) return;

        $title = (!empty($subject) && $subject !== 'Alert triggered') ? $subject : 'Server Monitor Alert';
        $dashboardUrl = url('/dashboard');

        $this->notifications->sendDiscordAlert(
            $botToken,
            $roleId ?? '',
            $message,
            $channelId,
            $title,
            $url,
            '#ED4245',
            $dashboardUrl
        );
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
