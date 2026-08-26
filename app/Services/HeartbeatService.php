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
use App\Models\ServerNetworkStats;
use App\Models\ServerUpdate;
use App\Models\Service;
use App\Models\Setting;
use App\NodeConfig\Jobs\EvaluateNodeConfig;
use App\NodeConfig\Models\NodeConfig;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class HeartbeatService
{
    public function process(Agent $agent, Server $server, array $payload): array
    {
        $oldStatus = $server->status;
        $offlineThresholdSeconds = self::secondsSetting('offline_threshold', 15);

        // Accumulate monitored online time OUTSIDE the transaction so it always persists.
        // ONLY accumulate time if the server was ALREADY in Online status prior to this heartbeat.
        // If it was offline, this first heartbeat transitions it back to online, so we do NOT add the offline gap to online_seconds.
        if ($oldStatus === ServerStatus::Online->value && $agent->last_seen_at) {
            $this->accumulateOnlineSeconds($agent, $server);
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

            $this->bringServerOnline($agent, $server);

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

            // Ingest Metrics (agent-level samples) + the per-server rollup row
            $this->ingestMetrics($heartbeat, $agent, $payload);
            $this->recordServerUpdate($server, $payload);

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
            $this->maybeDispatchPortPing($server, $agent);

            // Update Current State: Processes
            if (isset($payload['processes']) && is_array($payload['processes'])) {
                $this->updateProcesses($agent, $payload['processes']);
            }

            // The noise-filtered discovered sets feed the monitoring filter so
            // unmonitored processes/ports/interfaces can be checked on. They are the
            // agent-wide view, independent of this server's filter.
            if (array_key_exists('available_processes', $payload) || array_key_exists('available_ports', $payload) || array_key_exists('available_interfaces', $payload)) {
                $updates = [];
                if (array_key_exists('available_processes', $payload)) {
                    $updates['available_processes'] = $payload['available_processes'];
                }
                if (array_key_exists('available_ports', $payload)) {
                    $updates['available_ports'] = $payload['available_ports'];
                }
                if (array_key_exists('available_interfaces', $payload)) {
                    $updates['available_interfaces'] = $payload['available_interfaces'];
                }
                if ($updates !== []) {
                    $agent->update($updates);
                }
            }

            // Acknowledge Completed Commands
            if (isset($payload['completed_commands']) && is_array($payload['completed_commands'])) {
                $this->processCompletedCommands($payload['completed_commands']);
            }

            // Sync AgentConfiguration from agent's reported config (source of truth from bootstrap.json)
            if (isset($payload['agent_config']) && is_array($payload['agent_config'])) {
                $this->syncReportedAgentConfig($agent, $payload['agent_config']);
            }

            // Fetch current configuration
            $currentConfig = $agent->currentConfiguration;
            $configVersion = $currentConfig ? $currentConfig->version : 1;
            $agentConfigVersion = (int) ($payload['configuration_version'] ?? 0);

            $globalInterval = self::secondsSetting('heartbeat_interval', 5);
            $response = [
                'heartbeat_interval' => $globalInterval ?: ($currentConfig ? $currentConfig->heartbeat_interval : 5),
                'current_time' => now()->timestamp,
                'feature_flags' => [],
                'server_uuid' => $server->uuid,
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

            $response['pending_commands'] = $this->claimPendingCommands($agent);

            return $response;
        });
    }

    /**
     * Aggregated heartbeat: ONE request per agent tick covering every server
     * the agent monitors. Agent-wide state (heartbeat row, metric samples,
     * services, discovered sets, command acks, config sync) is applied once;
     * each server partition drives only genuinely per-server work (rollup
     * row, online transition, node-config evaluation, port pings).
     *
     * Ports/processes arrive pre-filtered per server; their union becomes the
     * agent-wide inventory, so a server whose filter excludes a port can no
     * longer close a port another server monitors.
     */
    public function processAgent(Agent $agent, array $payload): array
    {
        $accepted = [];
        $revoked = [];
        foreach ((array) ($payload['servers'] ?? []) as $partition) {
            if (! is_array($partition) || empty($partition['server_uuid'])) {
                continue;
            }

            $uuid = $partition['server_uuid'];

            // Malformed uuids can never be owned; skip the query (the uuid
            // column is a native Postgres uuid and would reject the cast).
            if (! Str::isUuid($uuid)) {
                $revoked[] = $uuid;

                continue;
            }

            $server = Server::where('uuid', $uuid)->first();

            // No-resurrection guard mirrors the legacy path: unknown, unowned,
            // deleted or archived servers come back as revoked so the agent
            // drops them locally instead of retrying forever.
            if (! $server || $server->agent_id !== $agent->id || $server->agent_deleted || $server->status === ServerStatus::Archived->value) {
                $revoked[] = $uuid;

                continue;
            }

            $accepted[] = ['server' => $server, 'partition' => $partition];
        }

        // The agent sends its metrics once at the top level; partitions carry
        // no metrics of their own.
        $metrics = is_array($payload['metrics'] ?? null) ? $payload['metrics'] : [];
        // Fallback: Go sends cpu/memory/disk/network at top level, not inside 'metrics'
        if (empty($metrics) && (isset($payload['cpu']) || isset($payload['memory']) || isset($payload['disk']))) {
            $metrics = [
                'cpu' => $payload['cpu'] ?? null,
                'memory' => $payload['memory'] ?? null,
                'disk' => $payload['disk'] ?? null,
                'uptime' => $payload['uptime'] ?? null,
                'network' => $payload['network'] ?? null,
            ];
        }
        $offlineThresholdSeconds = self::secondsSetting('offline_threshold', 15);

        // Online-time accumulation outside the transaction (see process()).
        foreach ($accepted as ['server' => $server]) {
            if ($server->status === ServerStatus::Online->value && $agent->last_seen_at) {
                $this->accumulateOnlineSeconds($agent, $server);
            }
        }

        return DB::transaction(function () use ($agent, $payload, $metrics, $accepted, $revoked, $offlineThresholdSeconds) {
            // ---- agent-wide state, applied ONCE per tick ----
            $oldVersion = $agent->version;
            $newVersion = $payload['agent_version'] ?? $agent->version;
            if ($oldVersion !== $newVersion && isset($accepted[0]['server'])) {
                Activity::create([
                    'server_id' => $accepted[0]['server']->id,
                    'agent_id' => $agent->id,
                    'type' => 'agent_updated',
                    'description' => "Agent updated from version {$oldVersion} to {$newVersion}.",
                ]);
            }

            $agent->update([
                'last_seen_at' => now(),
                'version' => $newVersion,
            ]);

            $heartbeat = Heartbeat::create([
                'agent_id' => $agent->id,
                'latency_ms' => null,
                'agent_time' => isset($payload['timestamp']) ? Carbon::createFromTimestamp($payload['timestamp']) : null,
                'status' => 'success',
                'received_at' => now(),
            ]);

            $this->ingestMetrics($heartbeat, $agent, $metrics);

            // Ports/processes: union across partitions -> one agent-wide state.
            // 2.7+ sends top-level dicts + per-server lists of keys (deduped); older agents sent full objects per partition.
            Log::info('[heartbeat:debug2] per-server network', [
                'servers' => array_map(fn ($p) => ['uuid' => substr($p['server_uuid'] ?? '', 0, 8), 'net' => $p['network'] ?? null, 'net_is_string' => isset($p['network'][0]) ? is_string($p['network'][0]) : null], $payload['servers'] ?? []),
                'net_dict_keys' => is_array($payload['networks_dict'] ?? null) ? array_keys($payload['networks_dict']) : null,
            ]);
            $procDict = $payload['processes_dict'] ?? null;
            $portDict = $payload['ports_dict'] ?? null;
            $unionPorts = [];
            $unionProcesses = [];
            foreach ($accepted as ['partition' => $partition]) {
                $rawPorts = (array) ($partition['open_db_ports'] ?? []);
                $rawProcs = (array) ($partition['processes'] ?? []);
                // New: list of keys referencing top-level dicts
                if (! empty($rawPorts) && is_string($rawPorts[0] ?? null) && is_array($portDict)) {
                    foreach ($rawPorts as $key) {
                        if (isset($portDict[$key])) {
                            $unionPorts[] = $portDict[$key];
                        } elseif (is_numeric($key) && isset($portDict["tcp:{$key}"])) {
                            // fallback for old key format (just port number)
                            $unionPorts[] = $portDict["tcp:{$key}"];
                        }
                    }
                } else {
                    foreach ($rawPorts as $port) {
                        $unionPorts[] = $port;
                    }
                }
                if (! empty($rawProcs) && is_string($rawProcs[0] ?? null) && is_array($procDict)) {
                    foreach ($rawProcs as $name) {
                        if (isset($procDict[$name])) {
                            $unionProcesses[] = $procDict[$name];
                        }
                    }
                } else {
                    foreach ($rawProcs as $process) {
                        $unionProcesses[] = $process;
                    }
                }
            }
            if ($unionPorts !== []) {
                $this->updatePorts($agent, $unionPorts);
            }
            if ($unionProcesses !== []) {
                $this->updateProcesses($agent, $unionProcesses);
            }

            if (isset($payload['services']) && is_array($payload['services'])) {
                $this->updateServices($agent, $payload['services']);
            }

            // The noise-filtered discovered sets feed the monitoring filter so
            // unmonitored processes/ports/interfaces can be checked on. They are sent at
            // the top level because they are agent-wide.
            if (array_key_exists('available_processes', $payload) || array_key_exists('available_ports', $payload) || array_key_exists('available_interfaces', $payload)) {
                $updates = [];
                if (array_key_exists('available_processes', $payload)) {
                    $updates['available_processes'] = $payload['available_processes'];
                }
                if (array_key_exists('available_ports', $payload)) {
                    $updates['available_ports'] = $payload['available_ports'];
                }
                if (array_key_exists('available_interfaces', $payload)) {
                    $updates['available_interfaces'] = $payload['available_interfaces'];
                }
                if ($updates !== []) {
                    $agent->update($updates);
                }
            }

            if (isset($payload['completed_commands']) && is_array($payload['completed_commands'])) {
                $this->processCompletedCommands($payload['completed_commands']);
            }

            if (isset($payload['agent_config']) && is_array($payload['agent_config'])) {
                $this->syncReportedAgentConfig($agent, $payload['agent_config']);
            }

            // ---- per-server partitions ----
            foreach ($accepted as ['server' => $server, 'partition' => $partition]) {
                CheckServerOffline::dispatch($server->uuid)
                    ->delay(now()->addSeconds($offlineThresholdSeconds + 2));

                $this->bringServerOnline($agent, $server);
                // Merge per-partition network (filtered by that server's network_filter) into metrics.
                // 2.7+ sends networks_dict + per-server list of interface names (deduped); older sent full objects.
                $perServerMetrics = $metrics;
                $netDict = $payload['networks_dict'] ?? null;
                if (array_key_exists('network', $partition)) {
                    $rawNet = $partition['network'];
                    if (is_array($rawNet) && ! empty($rawNet) && is_string($rawNet[0] ?? null) && is_array($netDict)) {
                        $resolved = [];
                        foreach ($rawNet as $iface) {
                            if (isset($netDict[$iface])) {
                                $resolved[] = $netDict[$iface];
                            }
                        }
                        $perServerMetrics['network'] = $resolved;
                    } else {
                        $perServerMetrics['network'] = $rawNet;
                    }
                } elseif (isset($payload['network']) && is_array($payload['network'])) {
                    $perServerMetrics['network'] = $payload['network'];
                }
                $this->recordServerUpdate($server, $perServerMetrics);

                SystemTelemetryEvent::emit('agent_heartbeat', [
                    'server_id' => $server->id,
                    'server_name' => $server->name,
                    'server_uuid' => $server->uuid,
                    'latency_ms' => 0,
                    'cpu' => $metrics['cpu']['load1'] ?? ($metrics['cpu'] ?? 0),
                    'memory' => $metrics['memory']['percent'] ?? ($metrics['memory'] ?? 0),
                    'disk' => $metrics['disk']['percent'] ?? ($metrics['disk'] ?? 0),
                ]);

                $this->evaluateMetricsForNodeConfig($server, $agent, $metrics);
                $this->triggerOnlineStatusEvaluation($server);
                $this->maybeDispatchPortPing($server, $agent);
            }

            // ---- response ----
            $currentConfig = $agent->currentConfiguration;
            $configVersion = $currentConfig ? $currentConfig->version : 1;
            $agentConfigVersion = (int) ($payload['configuration_version'] ?? 0);

            $response = [
                'heartbeat_interval' => self::secondsSetting('heartbeat_interval', 5) ?: ($currentConfig ? $currentConfig->heartbeat_interval : 5),
                'current_time' => now()->timestamp,
                'feature_flags' => [],
                'server_uuids' => array_map(fn (array $entry) => $entry['server']->uuid, $accepted),
                'revoked_server_uuids' => $revoked,
            ];

            $latestBinaryUpdate = AgentVersion::orderBy('id', 'desc')
                ->first();
            $agentVersion = $agent->version;
            if ($latestBinaryUpdate && $agentVersion !== $latestBinaryUpdate->version) {
                // Pick the binary URL for the agent's platform — every server
                // on one computer shares the OS, so the first server suffices.
                $os = strtolower($accepted[0]['server']->operating_system ?? '');
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

            $response['pending_commands'] = $this->claimPendingCommands($agent);

            return $response;
        });
    }

    /** Settings may be stored in milliseconds; normalize to whole seconds. */
    private static function secondsSetting(string $key, int $default): int
    {
        $raw = (int) Setting::get($key, (string) $default);

        return $raw >= 1000 ? intdiv($raw, 1000) : ($raw ?: $default);
    }

    private function accumulateOnlineSeconds(Agent $agent, Server $server): void
    {
        $elapsedSeconds = (int) $agent->last_seen_at->diffInSeconds(now());
        $maxStepSeconds = max(5, self::secondsSetting('offline_threshold', 15) + 5);
        if ($elapsedSeconds > 0 && $elapsedSeconds <= $maxStepSeconds) {
            $server->increment('online_seconds', min($elapsedSeconds, $maxStepSeconds));
            $server->refresh();
        }
    }

    private function bringServerOnline(Agent $agent, Server $server): void
    {
        // Transition server to online if needed
        if ($server->status !== ServerStatus::Online->value) {
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
    }

    /**
     * Ping exposed TCP ports on an interval (drives PingServerPorts +
     * ports_ping node config alerts).
     */
    private function maybeDispatchPortPing(Server $server, Agent $agent): void
    {
        $pingInterval = self::secondsSetting('port_ping_interval', 60);
        if ($pingInterval > 0 && ! PingServerPorts::pingablePorts($server, $agent)->isEmpty()) {
            $cacheKey = 'port_ping_last:'.$server->uuid;
            $lastPing = (int) cache()->get($cacheKey, 0);
            if (now()->timestamp - $lastPing >= $pingInterval) {
                cache()->put($cacheKey, now()->timestamp, $pingInterval * 2);
                PingServerPorts::dispatch($server);
            }
        }
    }

    /** Atomically claim this agent's due pending commands and mark them sent. */
    private function claimPendingCommands(Agent $agent): array
    {
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

        return $commandsPayload;
    }

    /** Sync AgentConfiguration from the agent's reported config (bootstrap.json is the source of truth). */
    private function syncReportedAgentConfig(Agent $agent, array $agentCfg): void
    {
        $currentConfig = $agent->currentConfiguration;
        if (! $currentConfig) {
            return;
        }

        $cfgUpdates = [];
        if (isset($agentCfg['heartbeat_interval']) && $agentCfg['heartbeat_interval'] > 0) {
            $cfgUpdates['heartbeat_interval'] = (int) $agentCfg['heartbeat_interval'];
        }
        if (! empty($cfgUpdates)) {
            $currentConfig->update($cfgUpdates);
        }
    }

    private function ingestMetrics(Heartbeat $heartbeat, Agent $agent, array $payload): void
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
    }

    /**
     * Per-server metrics rollup: one server_updates row per heartbeat (the
     * dashboard and historical charts read this table) plus the real-time UI
     * push. Agent-level samples live in ingestMetrics; this is the per-server
     * projection of the same agent-wide metrics.
     */
    private function recordServerUpdate(Server $server, array $payload): void
    {
        // One pass over the interfaces: sum into the server_updates totals and
        // collect per-interface rows for the Network Traffic time-series.
        $networkRx = 0;
        $networkTx = 0;
        $now = now();
        $networkRows = [];
        foreach ($payload['network'] ?? [] as $net) {
            if (! is_array($net)) {
                continue;
            }
            $rx = (int) ($net['rx_bytes'] ?? 0);
            $tx = (int) ($net['tx_bytes'] ?? 0);
            $networkRx += $rx;
            $networkTx += $tx;

            $name = trim((string) ($net['interface'] ?? ''));
            if ($name === '') {
                continue;
            }
            $networkRows[] = [
                'server_id' => $server->id,
                'interface_name' => mb_substr($name, 0, 255),
                'interface_type' => (string) ($net['type'] ?? 'unknown'),
                'oper_state' => (string) ($net['state'] ?? 'unknown'),
                'rx_bytes' => $rx,
                'tx_bytes' => $tx,
                'created_at' => $now,
            ];
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
            'created_at' => $now,
        ]);

        // Per-interface rows feed the Network Traffic graph; the CAGGs roll them up.
        if ($networkRows !== []) {
            ServerNetworkStats::insert($networkRows);
        }

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
        // Grouped rows (Task Manager style): one per name with summed CPU/memory
        // and the pid list. Upsert by name, refreshing last_seen. The pid column
        // keeps the representative (lowest) pid for sorting/identity.
        foreach ($processes as $line) {
            if (! is_array($line)) {
                continue;
            }
            $name = trim((string) ($line['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $pids = array_values(array_filter(array_map('intval', $line['pids'] ?? [$line['pid'] ?? 0])));
            if ($pids === []) {
                continue;
            }
            Process::updateOrCreate(
                ['agent_id' => $agent->id, 'name' => $name],
                [
                    'pid' => min($pids),
                    'pids' => $pids,
                    'cpu' => $line['cpu'] ?? 0.0,
                    'memory' => $line['memory'] ?? 0.0,
                    'command_line' => $line['command_line'] ?? null,
                    'last_seen' => now(),
                ]
            );
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
