<?php

namespace App\NodeConfig\Jobs;

use App\Events\SystemTelemetryEvent;
use App\Models\ActionItem;
use App\Models\CustomActivityLog;
use App\Models\Server;
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
            $server->url = rtrim((string) config('app.frontend_url'), '/').'/servers/'.$server->uuid;
        }

        $settings = $this->action['settings'];
        $context = $this->action['upstream_context'] ?? [];

        $severity = $settings['severity'] ?? 'warning';
        $channel = $settings['channel'] ?? 'email';

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
                        ? now()->diffForHumans($server->agent->last_seen_at, true).' ago'
                        : 'unknown'),
                'port' => $context['port'] ?? null,
                'portName' => $context['port_name'] ?? null,
                'protocol' => $context['protocol'] ?? null,
                'ping' => $context['ping'] ?? null,
                'threshold' => $context['threshold'] ?? null,
                'repeat' => [
                    'interval' => $context['repeat_interval'] ?? '',
                    'countOfMessage' => $repeatCount,
                    'max' => (int) ($context['repeat_max'] ?? -1) === -1 ? 'inf' : (int) ($context['repeat_max'] ?? -1),
                ],
                'discordRoleCallout' => $channel === 'discord'
                    ? (! empty($settings['role_id']) ? "<@&{$settings['role_id']}>" : '')
                    : '',
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

        if (! $isRepeat) {
            $message = preg_replace('/<if-repeat>.*?<\/if-repeat>/s', '', $message);
        } else {
            $message = preg_replace('/<\/?if-repeat>/', '', $message);
        }

        $message = trim($message);

        // Discord renders Markdown, not HTML — convert <b> bold tags to **.
        if ($channel === 'discord') {
            $message = str_replace(['<b>', '</b>'], '**', $message);
        }

        // Email <t:> timestamps stay unresolved here — resolved per recipient timezone in sendEmail().

        if ($message === '' && $channel !== 'discord') {
            return;
        }

        $serverUrl = $server ? url('/servers/'.$server->uuid) : null;

        $muted = filter_var(env('MUTE_NOTIFICATION', false), FILTER_VALIDATE_BOOL);
        if ($muted) {
            Log::info('[server-events] Notifications muted (MUTE_NOTIFICATION) — would send', [
                'server_id' => $this->serverId,
                'channel' => $channel,
                'subject' => $subject,
                'message' => $message,
            ]);
        }

        try {
            $sent = false;
            if (! $muted) {
                $sent = match ($channel) {
                    'email' => $message !== '' ? $this->sendEmail($server, $subject, $message, $serverUrl, $notifications) : false,
                    'discord' => $this->sendDiscord($settings, $message, $serverUrl, $notifications),
                    default => false,
                };
            }

            if ($sent) {
                Log::info('[server-events] Notification dispatched'.($isRepeat ? ' (repeat)' : ''), [
                    'server_id' => $this->serverId,
                    'server' => $server?->name,
                    'channel' => $channel,
                    'subject' => $subject,
                    'node' => $this->action['node_id'] ?? null,
                    'repeat' => $isRepeat,
                    'severity' => $severity,
                ]);

                SystemTelemetryEvent::emit('notification_dispatched', [
                    'server_id' => $this->serverId,
                    'server_name' => $server?->name,
                    'channel' => $channel,
                    'subject' => $subject,
                    'node_id' => $this->action['node_id'] ?? null,
                    'repeat' => $isRepeat,
                    'severity' => $severity,
                ]);

                try {
                    CustomActivityLog::create([
                        'type' => 'server_health',
                        'logable_type' => 'server',
                        'logable_id' => $this->serverId,
                        'user' => 'system',
                        'action' => $title,
                        'title' => $title,
                        'details' => [
                            'channel' => $channel,
                            'subject' => $subject,
                            'message' => $message,
                            'severity' => $severity,
                            'repeat' => $isRepeat,
                            'node_id' => $this->action['node_id'] ?? null,
                        ],
                        'severity' => $severity,
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('[server-events] Failed to log notification in server_health_logs', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // ponytail: board must show even when muted — only notification service muted
            $this->syncActionBoard($server, $severity, $title, $channel);
        } catch (\Throwable $e) {
            Log::error('[server-events] Notification failed', [
                'server_id' => $this->serverId,
                'server' => $server?->name,
                'channel' => $channel,
                'error' => $e->getMessage(),
                'node_id' => $this->action['node_id'] ?? null,
            ]);
            // ensure board still shows even if notification threw
            try {
                $this->syncActionBoard($server, $severity, $title, $channel);
            } catch (\Throwable $inner) {
                Log::warning('[action-items] Failed to sync after notification error', ['error' => $inner->getMessage()]);
            }
        }
    }

    private function sendEmail(?Server $server, string $subject, string $message, ?string $url, NotificationService $notifications): bool
    {
        $recipients = $server?->client?->secopclients ?? collect();
        $groups = $recipients->groupBy(fn ($user) => $user->timezone ?: 'UTC');

        $sentAny = false;

        foreach ($groups as $timezone => $users) {
            $emails = $users->pluck('email')->filter()->values()->all();
            if (empty($emails)) {
                continue;
            }

            $notifications->sendEmailAlert($emails, $this->resolveTimestamps($message, $timezone), $subject, $url);
            $sentAny = true;
        }

        if (! $sentAny) {
            Log::warning('[server-events] Email notification skipped: no recipients found', [
                'server_id' => $server?->id,
            ]);
        }

        return $sentAny;
    }

    private function resolveTimestamps(string $message, string $timezone): string
    {
        return preg_replace_callback('/<t:(\d+)(?::[a-zA-Z])?>/', function ($m) use ($timezone) {
            return Carbon::createFromTimestamp((int) $m[1])->setTimezone($timezone)->format('Y-m-d H:i:s');
        }, $message);
    }

    private function sendDiscord(array $settings, string $message, ?string $url, NotificationService $notifications): bool
    {
        $botToken = $settings['bot_token'] ?? null;
        $channelId = $settings['channel_id'] ?? null;
        $roleId = $settings['role_id'] ?? null;

        if (! $botToken || ! $channelId) {
            Log::warning('[server-events] Discord notification skipped: missing bot_token or channel_id', [
                'bot_token_configured' => ! empty($botToken),
                'channel_id_configured' => ! empty($channelId),
            ]);

            return false;
        }

        return $notifications->sendDiscordAlert($botToken, $roleId ?? '', $message, $channelId);
    }

    private function resolveTemplates(string $text, array $data): string
    {
        return preg_replace_callback('/\{([^}]+)\}/', function ($matches) use ($data) {
            return $this->resolveTemplateVar($matches[1], $data);
        }, $text);
    }

    private function syncActionBoard(?Server $server, string $severity, string $title, string $channel): void
    {
        if (! $server) {
            return;
        }

        // ponytail: one board item per chain per server — id the chain so levels overwrite, not stack
        // 10s/20s/30s are the same chain (same metric+threshold), showing all three is clutter.
        $context = $this->action['upstream_context'] ?? [];
        $metricType = $context['metric_type'] ?? null;
        $threshold = $context['threshold'] ?? $this->action['settings']['threshold'] ?? null;
        $nodeId = $this->action['node_id'] ?? 'unknown';
        if ($metricType && preg_match('/^(cpu|memory|disk|network)_usage|server_status|ports_ping$/', $metricType)) {
            $base = 'alert_'.$metricType;
            if ($threshold !== null && $threshold !== '' && is_numeric($threshold)) {
                $base .= '_'.(int) $threshold;
            }
            // chain id via metric+threshold — same chain overwrites, different threshold keeps separate
        } else {
            $base = 'alert_'.$nodeId;
        }
        $severity = in_array($severity, ['critical', 'warning', 'info'], true) ? $severity : 'warning';
        $clientId = $server->client_id;
        $serverId = $server->id;
        $common = [
            'message' => $title,
            'severity' => $severity,
            'client_name' => $server->client?->name ?? 'Unknown',
            'server_name' => $server->name,
            'status' => 'open',
            'completed_at' => null,
        ];

        try {
            // Single unassigned item for all channels — claim is manual, not auto.
            // Email already limits recipients via sendEmail(); board visibility stays unassigned.
            ActionItem::updateOrCreate(
                ['action_type' => $base, 'server_id' => $serverId, 'client_id' => $clientId],
                array_merge($common, ['assigned_to' => null])
            );

            // Clean legacy per-node/per-user variants and older sustain levels for same metric/server
            // e.g. alert_email_10, alert_email_10_1, alert_discord_30 → replaced by alert_disk_usage
            $metricName = $context['metric_name'] ?? null;
            ActionItem::where('server_id', $serverId)
                ->where('action_type', 'like', 'alert_%')
                ->where('action_type', '!=', $base)
                ->where('status', 'open')
                ->get()
                ->each(function ($item) use ($metricType, $metricName) {
                    if ($metricType && $metricName && str_contains($item->message, $metricName)) {
                        $item->delete();
                    } elseif (! $metricType) {
                        if (preg_match('/^alert_(email|discord|sustained)_/', $item->action_type)) {
                            $item->delete();
                        }
                    } elseif ($metricType) {
                        // fallback: if we have metricType but message check missed (e.g. offline), keep other metrics intact
                        // only delete if action_type looks like legacy per-node for same metric family
                        if (preg_match('/^alert_(email|discord)_/', $item->action_type)) {
                            // check if legacy item's message also contains a usage metric — be conservative, only delete if same metricType prefix
                            $item->delete();
                        }
                    }
                });

            // Also purge per-user suffix rows for the new base (legacy email assigned variants)
            ActionItem::where('server_id', $serverId)
                ->where('action_type', 'like', $base.'\_%')
                ->delete();
        } catch (\Throwable $e) {
            Log::warning('[action-items] Failed to sync alert action item', ['error' => $e->getMessage()]);
        }
    }

    private function resolveTemplateVar(string $path, array $data): string
    {
        $allowedPrefixes = ['server', 'runtime'];

        if ($path === '' || ! preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$/', $path)) {
            return '{'.$path.'}';
        }

        $firstSegment = strtolower(explode('.', $path)[0]);

        if (! in_array($firstSegment, $allowedPrefixes, true)) {
            return '{'.$path.'}';
        }

        $result = data_get($data, $path);

        return $result !== null ? (string) $result : '{'.$path.'}';
    }
}
