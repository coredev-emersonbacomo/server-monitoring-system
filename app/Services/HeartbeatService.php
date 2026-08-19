<?php

namespace App\Services;

use App\Enums\ServerStatus;
use App\Events\ServerStatsUpdated;
use App\Events\ServerStatusUpdated;
use App\Events\SystemTelemetryEvent;
use App\Jobs\CheckServerOffline;
use App\Jobs\PingServerPorts;
use App\Models\ActionItem;
use App\Models\Activity;
use App\Models\Agent;
use App\Models\AgentCommand;
use App\Models\AgentVersion;
use App\Models\CommandResult;
use App\Models\CustomActivityLog;
use App\Models\Heartbeat;
use App\Models\MetricBatch;
use App\Models\MetricSample;
use App\Models\Port;
use App\Models\Process;
use App\Models\Server;
use App\Models\ServerUpdate;
use App\Models\Service;
use App\Models\Setting;
use App\NodeConfig\Jobs\EvaluateNodeConfig;
use App\NodeConfig\Models\NodeConfig;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HeartbeatService
{
    public function process(Agent $agent, Server $server, array $payload): array
    {
        $oldStatus = $server->status;

        // Accumulate monitored online time OUTSIDE the transaction so it always persists.
        // ONLY accumulate time if the server was ALREADY in Online status prior to this heartbeat.
        // If it was offline, this first heartbeat transitions it back to online, so we do NOT add the offline gap to online_seconds.
        $rawOffline = (int) Setting::get('offline_threshold', '15');
        $offlineThresholdSeconds = $rawOffline >= 1000 ? intdiv($rawOffline, 1000) : ($rawOffline ?: 15);
        if ($oldStatus === ServerStatus::Online->value && $agent->last_seen_at) {
            $elapsedSeconds = (int) $agent->last_seen_at->diffInSeconds(now());
            $maxStepSeconds = max(5, $offlineThresholdSeconds + 5);
            if ($elapsedSeconds > 0 && $elapsedSeconds <= $maxStepSeconds) {
                $incrementSeconds = min($elapsedSeconds, $maxStepSeconds);
                $server->increment('online_seconds', $incrementSeconds);
                $server->refresh();
            }
        }

        return DB::transaction(function () use ($agent, $server, $payload, $offlineThresholdSeconds) {
            $oldVersion = $agent->version;
            $newVersion = $payload['agent_version'] ?? $agent->version;
            if ($oldVersion !== $newVersion) {
                Activity::create([
                    'server_id' => $server->id,
                    'agent_id' => $agent->id,
                    'type' => 'agent_updated',
                    'description' => "Agent updated from version {$oldVersion} to {$newVersion}.",
                ]);
            }

            $agent->update([
                'last_seen_at' => now(),
                'version' => $newVersion,
            ]);

            CheckServerOffline::dispatch($server->uuid)
                ->delay(now()->addSeconds($offlineThresholdSeconds + 2));

            // Transition server to online if needed
            $oldStatus = $server->status;
            if ($oldStatus !== ServerStatus::Online->value) {
                $server->update(['status' => ServerStatus::Online->value]);

                Activity::create([
                    'server_id' => $server->id,
                    'agent_id' => $agent->id,
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
                        'message' => "Agent came online for server: {$server->name}",
                        'server_name' => $server->name,
                    ]),
                ]);

                // Resolve server offline problems on the Action Board
                ActionItem::where('action_type', 'server_offline')
                    ->where('server_id', $server->id)
                    ->where('status', 'open')
                    ->update(['status' => 'completed', 'completed_at' => now()]);

                // Real-time push so UI immediately reflects online status (failsafe if Reverb is offline)
                try {
                    ServerStatusUpdated::dispatch($server->uuid, ServerStatus::Online->value, $server->name);
                    ServerStatsUpdated::dispatchSync($server->uuid, [
                        'timestamp' => now()->timestamp,
                        'c' => 0.0,
                        'm' => 0.0,
                        'd' => 0.0,
                        'netIn' => 0.0,
                        'netOut' => 0.0,
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('[broadcast] Failed to push online update', ['error' => $e->getMessage()]);
                }
            }

            // Create Heartbeat
            $heartbeat = Heartbeat::create([
                'agent_id' => $agent->id,
                'latency_ms' => $payload['latency_ms'] ?? null,
                'agent_time' => isset($payload['timestamp']) ? Carbon::createFromTimestamp($payload['timestamp']) : null,
                'status' => 'success',
                'received_at' => now(),
            ]);

            SystemTelemetryEvent::emit('agent_heartbeat', [
                'server_id' => $server->id,
                'server_name' => $server->name,
                'server_uuid' => $server->uuid,
                'latency_ms' => $payload['latency_ms'] ?? 0,
                'cpu' => $payload['cpu']['load1'] ?? ($payload['cpu'] ?? 0),
                'memory' => $payload['memory']['percent'] ?? ($payload['memory'] ?? 0),
                'disk' => $payload['disk']['percent'] ?? ($payload['disk'] ?? 0),
            ]);

            // Ingest Metrics
            $this->ingestMetrics($heartbeat, $agent, $server, $payload);

            // Trigger node config evaluation: numeric metrics + online status
            $this->evaluateMetricsForNodeConfig($server, $agent, $payload);
            $this->triggerOnlineStatusEvaluation($server);

            // Update Current State: Services
            if (isset($payload['services']) && is_array($payload['services'])) {
                $this->updateServices($agent, $payload['services']);
            }

            // Update Current State: Ports
            if (isset($payload['open_db_ports']) && is_array($payload['open_db_ports'])) {
                $this->updatePorts($agent, $payload['open_db_ports']);
            }

            // Ping exposed TCP ports on an interval (drives PingServerPorts + ports_ping node config alerts)
            $rawPing = (int) Setting::get('port_ping_interval', '60');
            $pingInterval = $rawPing >= 1000 ? intdiv($rawPing, 1000) : ($rawPing ?: 60);
            if ($pingInterval > 0 && ! PingServerPorts::pingablePorts($server, $agent)->isEmpty()) {
                $cacheKey = 'port_ping_last:'.$server->uuid;
                $lastPing = (int) cache()->get($cacheKey, 0);
                if (now()->timestamp - $lastPing >= $pingInterval) {
                    cache()->put($cacheKey, now()->timestamp, $pingInterval * 2);
                    PingServerPorts::dispatch($server);
                }
            }

            // Update Current State: Processes
            if (isset($payload['top_processes']) && is_array($payload['top_processes'])) {
                $this->updateProcesses($agent, $payload['top_processes']);
            }

            // Acknowledge Completed Commands
            if (isset($payload['completed_commands']) && is_array($payload['completed_commands'])) {
                $this->processCompletedCommands($payload['completed_commands']);
            }

            // Sync AgentConfiguration from agent's reported config (source of truth from bootstrap.json)
            if (isset($payload['agent_config']) && is_array($payload['agent_config'])) {
                $agentCfg = $payload['agent_config'];
                $currentConfig = $agent->currentConfiguration;
                if ($currentConfig) {
                    $cfgUpdates = [];
                    if (isset($agentCfg['heartbeat_interval']) && $agentCfg['heartbeat_interval'] > 0) {
                        $cfgUpdates['heartbeat_interval'] = (int) $agentCfg['heartbeat_interval'];
                    }
                    if (! empty($cfgUpdates)) {
                        $currentConfig->update($cfgUpdates);
                    }
                }
            }

            // Fetch current configuration
            $currentConfig = $agent->currentConfiguration;
            $configVersion = $currentConfig ? $currentConfig->version : 1;
            $agentConfigVersion = (int) ($payload['configuration_version'] ?? 0);

            $rawInterval = (int) Setting::get('heartbeat_interval', '5');
            $globalInterval = $rawInterval >= 1000 ? intdiv($rawInterval, 1000) : ($rawInterval ?: 5);
            $response = [
                'heartbeat_interval' => $globalInterval ?: ($currentConfig ? $currentConfig->heartbeat_interval : 5),
                'current_time' => now()->timestamp,
                'feature_flags' => [],
                // Always include Reverb credentials so the agent can connect the WS control channel
                // even if bootstrap.json on disk is missing these fields (e.g. due to permissions)
                'server_uuid' => $server->uuid,
                // Per-server monitoring filter. null = monitor everything the
                // agent's built-in noise filter allows; a list = only those.
                'port_filter' => $server->port_filter,
                'process_filter' => $server->process_filter,
                'reverb_host' => env('REVERB_HOST', '127.0.0.1'),
                'reverb_port' => (int) env('REVERB_PORT', 8080),
                'reverb_scheme' => env('REVERB_SCHEME', 'http'),
                'reverb_app_key' => env('REVERB_APP_KEY'),
            ];

            $latestBinaryUpdate = AgentVersion::orderBy('id', 'desc')
                ->first();
            $agentVersion = $agent->version;
            if ($latestBinaryUpdate && $agentVersion !== $latestBinaryUpdate->version) {
                // Pick the binary URL for the agent's platform — the AgentVersion
                // record only stores the Windows URL.
                $os = strtolower($server->operating_system ?? '');
                $binaryUrl = str_contains($os, 'windows') ? url('/MonitorAgent.exe') : url('/agent');
                $response['pending_update'] = [
                    'version' => $latestBinaryUpdate->version,
                    'heartbeat_interval' => null,
                    'binary_url' => $binaryUrl,
                ];
            }

            if ($configVersion !== $agentConfigVersion && $currentConfig) {
                $response['configuration'] = array_merge(
                    $currentConfig->configuration_json,
                    ['version' => $configVersion]
                );
            }

            // Get Pending Commands
            $pendingCommands = AgentCommand::where('agent_id', $agent->id)
                ->where('status', 'pending')
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->orderBy('priority', 'asc')
                ->orderBy('created_at', 'asc')
                ->get();

            $commandsPayload = [];
            foreach ($pendingCommands as $cmd) {
                $cmd->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                ]);

                $commandsPayload[] = [
                    'id' => $cmd->id,
                    'type' => $cmd->type,
                    'payload' => $cmd->payload,
                ];
            }

            $response['pending_commands'] = $commandsPayload;

            return $response;
        });
    }

    private function ingestMetrics(Heartbeat $heartbeat, Agent $agent, Server $server, array $payload): void
    {
        $batch = MetricBatch::create([
            'heartbeat_id' => $heartbeat->id,
            'agent_id' => $agent->id,
            'collector_version' => $payload['agent_version'] ?? null,
        ]);

        $samples = [];
        $recordedAt = now();

        // Parse CPU
        if (isset($payload['cpu'])) {
            $cpu = $payload['cpu'];
            if (is_array($cpu)) {
                if (isset($cpu['load1'])) {
                    $samples[] = ['metric_type' => 'cpu', 'metric_name' => 'load1', 'value' => (float) $cpu['load1'], 'unit' => 'load'];
                }
                if (isset($cpu['load5'])) {
                    $samples[] = ['metric_type' => 'cpu', 'metric_name' => 'load5', 'value' => (float) $cpu['load5'], 'unit' => 'load'];
                }
                if (isset($cpu['load15'])) {
                    $samples[] = ['metric_type' => 'cpu', 'metric_name' => 'load15', 'value' => (float) $cpu['load15'], 'unit' => 'load'];
                }
            } elseif (is_numeric($cpu)) {
                $samples[] = ['metric_type' => 'cpu', 'metric_name' => 'load1', 'value' => (float) $cpu, 'unit' => 'load'];
            }
        }

        // Parse Memory
        if (isset($payload['memory'])) {
            $mem = $payload['memory'];
            if (is_array($mem)) {
                if (isset($mem['percent'])) {
                    $samples[] = ['metric_type' => 'memory', 'metric_name' => 'percent', 'value' => (float) $mem['percent'], 'unit' => '%'];
                }
                if (isset($mem['used_kb'])) {
                    $samples[] = ['metric_type' => 'memory', 'metric_name' => 'used', 'value' => (float) ($mem['used_kb'] / 1024), 'unit' => 'MB'];
                }
                if (isset($mem['total_kb'])) {
                    $samples[] = ['metric_type' => 'memory', 'metric_name' => 'total', 'value' => (float) ($mem['total_kb'] / 1024), 'unit' => 'MB'];
                }
            } elseif (is_numeric($mem)) {
                $samples[] = ['metric_type' => 'memory', 'metric_name' => 'percent', 'value' => (float) $mem, 'unit' => '%'];
            }
        }

        // Parse Disk
        if (isset($payload['disk'])) {
            $disk = $payload['disk'];
            if (is_array($disk)) {
                if (isset($disk['percent'])) {
                    $samples[] = ['metric_type' => 'disk', 'metric_name' => 'percent', 'value' => (float) $disk['percent'], 'unit' => '%'];
                }
                if (isset($disk['used'])) {
                    $samples[] = ['metric_type' => 'disk', 'metric_name' => 'used', 'value' => (float) ($disk['used'] / (1024 ** 3)), 'unit' => 'GB'];
                }
                if (isset($disk['total'])) {
                    $samples[] = ['metric_type' => 'disk', 'metric_name' => 'total', 'value' => (float) ($disk['total'] / (1024 ** 3)), 'unit' => 'GB'];
                }
            } elseif (is_numeric($disk)) {
                $samples[] = ['metric_type' => 'disk', 'metric_name' => 'percent', 'value' => (float) $disk, 'unit' => '%'];
            }
        }

        // Parse Uptime
        if (isset($payload['uptime'])) {
            $samples[] = ['metric_type' => 'uptime', 'metric_name' => 'uptime', 'value' => (float) $payload['uptime'], 'unit' => 'seconds'];
        }

        foreach ($samples as $sample) {
            MetricSample::create(array_merge($sample, [
                'batch_id' => $batch->id,
                'recorded_at' => $recordedAt,
            ]));
        }

        // Calculate total network bytes from nested interfaces if present
        $networkRx = 0;
        $networkTx = 0;
        if (isset($payload['network']) && is_array($payload['network'])) {
            foreach ($payload['network'] as $net) {
                $networkRx += $net['rx_bytes'] ?? 0;
                $networkTx += $net['tx_bytes'] ?? 0;
            }
        }

        // Populate server_updates table for compatibility with dashboard/historical charts
        ServerUpdate::create([
            'server_id' => $server->id,
            'cpu_usage' => (float) ($payload['cpu']['load1'] ?? 0.0),
            'memory_usage' => (float) ($payload['memory']['percent'] ?? 0.0),
            'storage' => (float) ($payload['disk']['percent'] ?? 0.0),
            'uptime' => (int) ($payload['uptime'] ?? 0),
            'network_rbytes' => $networkRx,
            'network_tbytes' => $networkTx,
            'created_at' => $recordedAt,
        ]);

        // Broadcast stats for UI compatibility (similar to existing server/stats ingest)
        $uiStats = [
            'timestamp' => now()->timestamp,
            'c' => (float) ($payload['cpu']['load1'] ?? 0.0),
            'm' => (float) ($payload['memory']['percent'] ?? 0.0),
            'd' => (float) ($payload['disk']['percent'] ?? 0.0),
            'netIn' => 0.0,
            'netOut' => 0.0,
        ];

        // Trigger real-time stats update broadcast (failsafe if Reverb is offline)
        try {
            ServerStatsUpdated::dispatchSync($server->uuid, $uiStats);
        } catch (\Throwable $e) {
            Log::warning('[broadcast] Failed to push stats update', ['error' => $e->getMessage()]);
        }
    }

    private function updateServices(Agent $agent, array $services): void
    {
        $identifiers = [];
        foreach ($services as $srv) {
            $identifier = $srv['identifier'] ?? $srv['name'] ?? null;
            if (! $identifier) {
                continue;
            }

            $identifiers[] = $identifier;

            Service::updateOrCreate(
                ['agent_id' => $agent->id, 'identifier' => $identifier],
                [
                    'name' => $srv['name'] ?? $identifier,
                    'state' => $srv['state'] ?? 'unknown',
                    'status' => $srv['status'] ?? null,
                    'last_seen' => now(),
                ]
            );
        }

        // Clean up services not in current payload
        Service::where('agent_id', $agent->id)
            ->whereNotIn('identifier', $identifiers)
            ->delete();
    }

    private function updatePorts(Agent $agent, array $ports): void
    {
        // No duplicate noise filtering here: the agent already filters out
        // loopback/system/ephemeral ports and applies the server's filter,
        // so a filtered-in port must never be silently dropped.
        $portsList = [];

        foreach ($ports as $port) {
            $portNum = isset($port['port']) ? (int) $port['port'] : null;
            $proto = $port['protocol'] ?? 'tcp';
            if (is_null($portNum)) {
                continue;
            }

            $portsList[] = ['port' => $portNum, 'proto' => $proto];

            Port::updateOrCreate(
                ['agent_id' => $agent->id, 'protocol' => $proto, 'port' => $portNum],
                [
                    'state' => $port['state'] ?? 'listening',
                    'process_name' => $port['process'] ?? null,
                    'last_seen' => now(),
                ]
            );
        }

        // Mark ports not in the current payload as closed instead of deleting them
        $activeKeys = [];
        foreach ($portsList as $p) {
            $activeKeys[] = "{$p['proto']}:{$p['port']}";
        }

        $allPorts = Port::where('agent_id', $agent->id)->get();
        foreach ($allPorts as $dbPort) {
            $key = "{$dbPort->protocol}:{$dbPort->port}";
            if (! in_array($key, $activeKeys)) {
                $dbPort->update(['state' => 'closed']);
            }
        }
    }

    private function updateProcesses(Agent $agent, array $processes): void
    {
        // Keep rows as history (the SecOps filter needs every process seen),
        // upserting by PID and refreshing last_seen.
        foreach ($processes as $line) {
            if (is_array($line)) {
                $pid = $line['pid'] ?? 0;
                if ($pid <= 0) {
                    continue;
                }
                Process::updateOrCreate(
                    ['agent_id' => $agent->id, 'pid' => $pid],
                    [
                        'name' => $line['name'] ?? 'unknown',
                        'cpu' => $line['cpu'] ?? 0.0,
                        'memory' => $line['memory'] ?? 0.0,
                        'command_line' => $line['command_line'] ?? null,
                        'last_seen' => now(),
                    ]
                );
            } else {
                // Parse line: PID COMM %CPU %MEM
                $parts = preg_split('/\s+/', trim($line));
                if (count($parts) >= 4 && is_numeric($parts[0])) {
                    Process::updateOrCreate(
                        ['agent_id' => $agent->id, 'pid' => (int) $parts[0]],
                        [
                            'name' => $parts[1],
                            'cpu' => (float) $parts[2],
                            'memory' => (float) $parts[3],
                            'last_seen' => now(),
                        ]
                    );
                }
            }
        }
    }

    private function processCompletedCommands(array $completedCommands): void
    {
        foreach ($completedCommands as $ack) {
            $cmdId = $ack['command_id'] ?? null;
            if (! $cmdId) {
                continue;
            }

            $command = AgentCommand::find($cmdId);
            if (! $command) {
                continue;
            }

            $status = $ack['status'] ?? 'completed';
            $command->update([
                'status' => $status,
                'completed_at' => now(),
            ]);

            CommandResult::create([
                'command_id' => $command->id,
                'status' => $status,
                'output' => $ack['output'] ?? null,
                'error_message' => $ack['error'] ?? null,
                'execution_time_ms' => $ack['execution_time_ms'] ?? null,
                'reported_at' => now(),
            ]);

            Activity::create([
                'server_id' => $command->agent->server_id,
                'agent_id' => $command->agent_id,
                'type' => $status === 'completed' ? 'command_completed' : 'command_failed',
                'description' => "Command {$command->type} reported {$status}.",
            ]);
        }
    }

    private function evaluateMetricsForNodeConfig(Server $server, Agent $agent, array $payload): void
    {
        $config = NodeConfig::resolveForServer($server->uuid);
        if (! $config) {
            return;
        }

        $metricMap = [
            'cpu_usage' => ['sample_type' => 'cpu',    'sample_name' => 'load1',  'payload_path' => ['cpu', 'load1']],
            'memory_usage' => ['sample_type' => 'memory', 'sample_name' => 'percent', 'payload_path' => ['memory', 'percent']],
            'disk_usage' => ['sample_type' => 'disk',   'sample_name' => 'percent', 'payload_path' => ['disk', 'percent']],
        ];

        foreach ($metricMap as $metricType => $info) {
            $sourceNodeId = $this->findMetricNode($config, $metricType);
            if (! $sourceNodeId) {
                continue;
            }

            $value = $this->resolvePayloadValue($payload, $info['payload_path']);
            if ($value === null) {
                continue;
            }

            EvaluateNodeConfig::dispatch($config->id, $sourceNodeId, $value, [
                'server_id' => $server->id,
                'server_name' => $server->name,
                'client_name' => $server->client->name ?? 'Unknown',
                'metric_type' => $metricType,
            ]);
        }
    }

    private function triggerOnlineStatusEvaluation(Server $server): void
    {
        $config = NodeConfig::resolveForServer($server->uuid);
        if (! $config) {
            return;
        }

        $sourceNodeId = $this->findMetricNode($config, 'server_status');
        if (! $sourceNodeId) {
            return;
        }

        EvaluateNodeConfig::dispatch($config->id, $sourceNodeId, 'online', [
            'server_id' => $server->id,
            'server_name' => $server->name,
            'client_name' => $server->client->name ?? 'Unknown',
            'metric_type' => 'server_status',
        ]);
    }

    private function resolvePayloadValue(array $payload, array $path): ?float
    {
        // 1. Try nested path (e.g. $payload['disk']['percent'])
        $current = $payload;
        $found = true;
        foreach ($path as $key) {
            if (is_array($current) && isset($current[$key])) {
                $current = $current[$key];
            } else {
                $found = false;
                break;
            }
        }
        if ($found && is_numeric($current)) {
            return (float) $current;
        }

        // 2. Try flat top-level key (e.g. $payload['disk'], $payload['cpu'], $payload['memory'])
        $topLevelKey = $path[0];
        if (isset($payload[$topLevelKey]) && is_numeric($payload[$topLevelKey])) {
            return (float) $payload[$topLevelKey];
        }

        return null;
    }

    private function findMetricNode(NodeConfig $config, string $metricType): ?string
    {
        $configData = $config->getParsedConfig();
        $nodes = $configData['nodes'] ?? [];

        foreach ($nodes as $node) {
            if (($node['type'] ?? '') === 'metric' && ($node['settings']['metric_type'] ?? '') === $metricType) {
                return $node['id'];
            }
        }

        return null;
    }
}
