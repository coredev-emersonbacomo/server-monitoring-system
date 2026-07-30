<?php

namespace App\NodeConfig\Jobs;

use App\Models\Server;
use App\Models\ServerHealthLog;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 30;

    public function __construct(
        private array $action,
        private ?int $serverId,
    ) {}

    public function handle(NotificationService $notifications): void
    {
        $server = $this->serverId ? Server::with('client.secopclients')->find($this->serverId) : null;

        // Make {server.url} resolvable from templates
        if ($server) {
            $server->url = url('/servers/' . $server->uuid);
        }

        $settings = $this->action['settings'];
        $context = $this->action['upstream_context'] ?? [];

        $severity = $settings['severity'] ?? 'warning';

        $firstTriggerTs = isset($context['first_trigger_timestamp'])
            ? Carbon::parse($context['first_trigger_timestamp'])->format('Y-m-d H:i:s')
            : now()->format('Y-m-d H:i:s');

        $repeatCount = (int) ($context['repeat_count'] ?? 0);
        $isRepeat = ($context['repeat_fire'] ?? false) === true || $repeatCount > 0;

        $now = now();

        $templateData = [
            'server' => $server,
            'runtime' => [
                'severity' => $severity,
                'metricName' => $context['metric_name'] ?? 'Unknown Metric',
                'sustainValue' => $context['sustain_value'] ?? '',
                'eventTimestamp' => $now->format('Y-m-d H:i:s'),
                'eventTimestampUnix' => (string) $now->timestamp,
                'firstTriggerTimestamp' => $firstTriggerTs,
                'firstTriggerTimestampUnix' => isset($context['first_trigger_timestamp'])
                    ? (string) Carbon::parse($context['first_trigger_timestamp'])->timestamp
                    : (string) $now->timestamp,
                'offlineTimestamp' => $context['offlineTimestamp']
                    ?? $server?->went_offline_at?->format('Y-m-d H:i:s')
                    ?? $now->format('Y-m-d H:i:s'),
                'offlineDuration' => $server?->went_offline_at
                    ? $server->went_offline_at->diffForHumans(now(), true)
                    : ($server?->agent?->last_seen_at
                        ? now()->diffForHumans($server->agent->last_seen_at, true) . ' ago'
                        : 'unknown'),
                'repeat' => [
                    'interval' => $context['repeat_interval'] ?? '',
                    'countOfMessage' => $repeatCount,
                    'max' => (int) ($context['repeat_max'] ?? -1) === -1 ? 'inf' : (int) ($context['repeat_max'] ?? -1),
                ],
            ],
        ];

        $metricName = $templateData['runtime']['metricName'] ?? 'Unknown Metric';
        $sustainValue = $templateData['runtime']['sustainValue'] ?? '';
        $isOffline = isset($context['offlineTimestamp']) || $metricName === 'Server Status';
        $title = $isOffline
            ? "Server offline for {$templateData['runtime']['offlineDuration']}"
            : ($sustainValue !== '' ? "{$metricName} above threshold for {$sustainValue}" : "{$metricName} alert triggered");

        $subject = $this->resolveTemplates($settings['subject'] ?? 'Alert triggered', $templateData);
        $message = $this->resolveTemplates($settings['message'] ?? '', $templateData);

        if (!$isRepeat) {
            $message = preg_replace('/<if-repeat>.*?<\/if-repeat>/s', '', $message);
        } else {
            $message = preg_replace('/<\/?if-repeat>/', '', $message);
        }

        $message = trim($message);
        $channel = $settings['channel'] ?? 'email';

        if ($message === '' && $channel !== 'discord') {
            return;
        }

        $serverUrl = $server ? url('/servers/' . $server->uuid) : null;

        try {
            $sent = match ($channel) {
                'email' => $message !== '' ? $this->sendEmail($server, $subject, $message, $serverUrl, $notifications) : false,
                'discord' => $this->sendDiscord($settings, $message, $serverUrl, $notifications),
                default => false,
            };

            if ($sent) {
                Log::info("[server-events] Notification dispatched" . ($isRepeat ? ' (repeat)' : ''), [
                    'server_id' => $this->serverId,
                    'server' => $server?->name,
                    'channel' => $channel,
                    'subject' => $subject,
                    'node' => $this->action['node_id'] ?? null,
                    'repeat' => $isRepeat,
                    'severity' => $severity,
                ]);

                \App\Events\SystemTelemetryEvent::emit('notification_dispatched', [
                    'server_id'   => $this->serverId,
                    'server_name' => $server?->name,
                    'channel'     => $channel,
                    'subject'     => $subject,
                    'node_id'     => $this->action['node_id'] ?? null,
                    'repeat'      => $isRepeat,
                    'severity'    => $severity,
                ]);

                try {
                    ServerHealthLog::create([
                        'logable_type' => 'server',
                        'logable_id'   => $this->serverId,
                        'user'         => 'system',
                        'title'        => $title,
                        'details'      => [
                            'channel'  => $channel,
                            'subject'  => $subject,
                            'message'  => $message,
                            'severity' => $severity,
                            'repeat'   => $isRepeat,
                            'node_id'  => $this->action['node_id'] ?? null,
                        ],
                        'severity' => $severity,
                    ]);
                } catch (\Throwable $e) {
                    Log::warning("[server-events] Failed to log notification in server_health_logs", [
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::error("[server-events] Notification failed", [
                'server_id' => $this->serverId,
                'server' => $server?->name,
                'channel' => $channel,
                'error' => $e->getMessage(),
                'node_id' => $this->action['node_id'] ?? null,
            ]);
        }
    }

    private function sendEmail(?Server $server, string $subject, string $message, ?string $url, NotificationService $notifications): bool
    {
        $emails = $server?->client?->secopclients?->pluck('email')->filter()->values()->all();
        if (empty($emails)) {
            Log::warning('[server-events] Email notification skipped: no recipients found', [
                'server_id' => $server?->id,
            ]);
            return false;
        }

        $notifications->sendEmailAlert($emails, $message, $subject, $url);
        return true;
    }

    private function sendDiscord(array $settings, string $message, ?string $url, NotificationService $notifications): bool
    {
        $botToken = $settings['bot_token'] ?? null;
        $channelId = $settings['channel_id'] ?? null;
        $roleId = $settings['role_id'] ?? null;

        if (!$botToken || !$channelId) {
            Log::warning('[server-events] Discord notification skipped: missing bot_token or channel_id', [
                'bot_token_configured' => !empty($botToken),
                'channel_id_configured' => !empty($channelId),
            ]);
            return false;
        }

        $notifications->sendDiscordAlert($botToken, $roleId ?? '', $message, $channelId, '', $url);
        return true;
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
