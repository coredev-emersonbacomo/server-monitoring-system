<?php

namespace App\Jobs;

use App\Enums\ServerHealth;
use App\Enums\ServerStatus;
use App\Events\ServerStatsUpdated;
use App\Events\ServerStatusUpdated;
use App\Models\ActionItem;
use App\Models\Activity;
use App\Models\Agent;
use App\Models\AgentLifecycleEvent;
use App\Models\CustomActivityLog;
use App\Models\Server;
use App\Models\Setting;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Engine\NodeTaskScheduler;
use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\Models\NodeConfigState;
use App\NodeConfig\Services\NodeConfigNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class MonitorServer implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 30;

    public function __construct(
        private readonly string $serverUuid,
    ) {}

    public function handle(NodeRegistry $registry, NodeConfigNotificationService $notifications): void
    {
        $server = Server::with(['client.secopclients', 'agent'])->where('uuid', $this->serverUuid)->first();
        if (! $server) {
            return;
        }

        // Decommissioned servers are out of the lifecycle: no offline flips, no
        // online recovery, no alerts. Only an explicit re-provision revives one.
        if ($server->agent_deleted || $server->status === ServerStatus::Archived->value) {
            return;
        }

        if (! $server->agent) {
            return;
        }

        $config = NodeConfig::resolveForServer($this->serverUuid);
        $engine = $config ? new NodeConfigEngine($registry) : null;

        // Fresh last_seen to respect offline_threshold exactly — avoids stale
        // eager-loaded agent when heartbeat just updated it.
        $lastSeen = Agent::where('id', $server->agent_id)->value('last_seen_at');
        $rawThreshold = (int) Setting::get('offline_threshold', '15');
        $thresholdSec = $rawThreshold >= 1000 ? intdiv($rawThreshold, 1000) : ($rawThreshold ?: 15);
        $isOffline = Server::computeHealth($lastSeen, $thresholdSec) === ServerHealth::Offline;
        $previousStatus = $server->status;

        if ($isOffline) {
            $this->handleOfflineTransition($server, $previousStatus, $config, $engine, $notifications);
        } else {
            $this->handleOnlineRecovery($server, $previousStatus);
        }
    }

    private function handleOfflineTransition(
        Server $server,
        string $previousStatus,
        ?NodeConfig $config,
        ?NodeConfigEngine $engine,
        NodeConfigNotificationService $notifications,
    ): void {
        $statusChanged = $previousStatus !== ServerStatus::Offline->value;

        if ($statusChanged) {
            $server->update([
                'status' => ServerStatus::Offline->value,
                'went_offline_at' => now(),
            ]);

            Activity::create([
                'server_id' => $server->id,
                'agent_id' => $server->agent?->id,
                'type' => 'server_offline',
                'description' => 'Server transitioned to Offline state.',
            ]);

            // Distinct backend-detected lifecycle event. Never recorded if the
            // agent already reported a graceful stopping/stopped event within a
            // grace window — a clean shutdown wins over a timeout.
            $this->recordUnexpectedDisconnect($server);

            CustomActivityLog::create([
                'type' => 'server_health',
                'logable_type' => get_class($server),
                'logable_id' => $server->id,
                'user_id' => null,
                'user' => 'System',
                'action' => 'Agent Offline',
                'details' => json_encode([
                    'message' => "Agent went offline for server: {$server->name}",
                    'server_name' => $server->name,
                ]),
            ]);

            try {
                ServerStatusUpdated::dispatch($server->uuid, ServerStatus::Offline->value, $server->name);
                ServerStatsUpdated::dispatchSync($server->uuid, [
                    'timestamp' => now()->timestamp,
                    'c' => 0.0,
                    'm' => 0.0,
                    'd' => 0.0,
                    'netIn' => 0.0,
                    'netOut' => 0.0,
                ]);
            } catch (\Throwable $e) {
                Log::warning('[broadcast] Failed to push offline update', ['error' => $e->getMessage()]);
            }

            if ($config && $engine) {
                $this->evaluateServerAlerts($server, $config, $engine, $notifications);
            }

            ActionItem::updateOrCreate(
                [
                    'action_type' => 'server_offline',
                    'server_id' => $server->id,
                    'client_id' => $server->client_id,
                ],
                [
                    'status' => 'open',
                    'assigned_to' => null,
                    'completed_at' => null,
                    'created_at' => now(),
                    'message' => "{$server->name} is offline",
                    'severity' => 'critical',
                    'client_name' => $server->client?->name ?? 'Unknown',
                    'server_name' => $server->name,
                ]
            );
        }
    }

    private function handleOnlineRecovery(Server $server, string $previousStatus): void
    {
        if ($previousStatus === ServerStatus::Offline->value) {
            $server->update([
                'status' => ServerStatus::Online->value,
                'went_offline_at' => null,
            ]);

            Activity::create([
                'server_id' => $server->id,
                'agent_id' => $server->agent?->id,
                'type' => 'server_online',
                'description' => 'Server transitioned to Online state.',
            ]);

            CustomActivityLog::create([
                'type' => 'server_health',
                'logable_type' => get_class($server),
                'logable_id' => $server->id,
                'user_id' => null,
                'user' => 'System',
                'action' => 'Agent Online',
                'details' => json_encode([
                    'message' => "Agent came back online for server: {$server->name}",
                    'server_name' => $server->name,
                ]),
            ]);

            // Reset graph states so the next evaluation starts fresh
            $this->resetGraphStates($server);

            try {
                ServerStatusUpdated::dispatch($server->uuid, ServerStatus::Online->value, $server->name);
            } catch (\Throwable $e) {
                Log::warning('[broadcast] Failed to push online update', ['error' => $e->getMessage()]);
            }

            Log::info('[server-events] Server recovered', [
                'server_id' => $server->id,
                'server' => $server->name,
            ]);
        }

        // If claimed by a user, mark as completed (so it appears in their completed history).
        // If unclaimed, delete it so it clears cleanly without cluttering completed records.
        ActionItem::where('action_type', 'server_offline')
            ->where('server_id', $server->id)
            ->where('status', 'open')
            ->whereNotNull('assigned_to')
            ->update(['status' => 'completed', 'completed_at' => now()]);

        ActionItem::where('action_type', 'server_offline')
            ->where('server_id', $server->id)
            ->where('status', 'open')
            ->whereNull('assigned_to')
            ->delete();

        // Also resolve alert ActionItems for server_status when server recovers
        ActionItem::where('server_id', $server->id)
            ->where('action_type', 'like', '%offline%')
            ->where('status', 'open')
            ->whereNotNull('assigned_to')
            ->update(['status' => 'completed', 'completed_at' => now()]);

        ActionItem::where('server_id', $server->id)
            ->where('action_type', 'like', '%offline%')
            ->where('status', 'open')
            ->whereNull('assigned_to')
            ->delete();
    }

    private function recordUnexpectedDisconnect(Server $server): void
    {
        $agent = $server->agent;
        if (! $agent) {
            return;
        }

        // A genuine graceful shutdown (stopping/stopped reported by the agent)
        // within the recent grace window takes precedence over a timeout.
        $graceSeconds = (int) (Setting::get('offline_threshold', '15')) * 4;
        $recentGraceful = AgentLifecycleEvent::where('agent_id', $agent->id)
            ->whereIn('event_type', ['stopping', 'stopped'])
            ->where('occurred_at', '>=', now()->subSeconds($graceSeconds))
            ->exists();

        if ($recentGraceful) {
            return;
        }

        AgentLifecycleEvent::create([
            'server_id' => $server->id,
            'agent_id' => $agent->id,
            'event_type' => 'unexpectedly_disconnected',
            'occurred_at' => now(),
        ]);
    }

    private function resetGraphStates(Server $server): void
    {
        $config = NodeConfig::resolveForServer($server->uuid);
        if (! $config) {
            return;
        }

        NodeConfigState::where('node_config_id', $config->id)
            ->where('server_id', $server->id)
            ->delete();

        NodeTaskScheduler::cancelByServer($server->id);
    }

    private function evaluateServerAlerts(
        Server $server,
        NodeConfig $config,
        NodeConfigEngine $engine,
        NodeConfigNotificationService $notifications,
    ): void {
        $agent = $server->agent;
        if (! $agent) {
            return;
        }

        $sourceNodeId = $engine->findMetricNode($config, 'server_status');
        if (! $sourceNodeId) {
            return;
        }

        $extraState = [
            'server_id' => $server->id,
            'server_name' => $server->name,
            'client_name' => $server->client?->name ?? 'Unknown',
            'metric_type' => 'server_status',
            'offlineTimestamp' => $server->went_offline_at?->format('Y-m-d H:i:s') ?? now()->format('Y-m-d H:i:s'),
        ];

        $result = $engine->trigger($config, $sourceNodeId, 'offline', $extraState, $server->id);
        if (! $result['success']) {
            return;
        }

        foreach ($result['timers'] as $timer) {
            NodeTaskScheduler::schedule(
                $timer['node_config_id'],
                $timer['node_id'],
                $timer['delay_ms'],
                array_merge($timer['context'], $extraState),
                $server->id,
            );
        }

        foreach ($result['actions'] as $action) {
            Log::info('[server-events] Offline alert triggered', [
                'server_id' => $server->id,
                'server' => $server->name,
                'node' => $action['node_id'],
            ]);
            $notifications->dispatchAction($action);
        }
    }
}
