<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\AgentIdentity;
use App\Models\Server;
use App\Models\Heartbeat;
use App\Models\MetricBatch;
use App\Models\MetricSample;
use App\Models\Service;
use App\Models\Port;
use App\Models\Process;
use App\Models\AgentCommand;
use App\Models\CommandResult;
use App\Models\Activity;
use App\Events\ServerStatsUpdated;
use App\Enums\ServerStatus;
use App\NodeConfig\Jobs\EvaluateNodeConfig;
use App\NodeConfig\Models\NodeConfig;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class HeartbeatService
{
    public function process(AgentIdentity $identity, array $payload): array
    {
        $agent = $identity->agent;
        $server = $agent->server;

        return DB::transaction(function () use ($identity, $agent, $server, $payload) {
            // Update last_used_at on identity
            $identity->update(['last_used_at' => now()]);

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

                \App\Models\CustomActivityLog::create([
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

                $this->triggerNodeConfigForServer($server, 'online');
            }

            // Create Heartbeat
            $heartbeat = Heartbeat::create([
                'agent_id' => $agent->id,
                'latency_ms' => $payload['latency_ms'] ?? null,
                'agent_time' => isset($payload['timestamp']) ? Carbon::createFromTimestamp($payload['timestamp']) : null,
                'status' => 'success',
                'received_at' => now(),
            ]);

            // Ingest Metrics
            $this->ingestMetrics($heartbeat, $agent, $payload);

            // Update Current State: Services
            if (isset($payload['services']) && is_array($payload['services'])) {
                $this->updateServices($agent, $payload['services']);
            }

            // Update Current State: Ports
            if (isset($payload['open_db_ports']) && is_array($payload['open_db_ports'])) {
                $this->updatePorts($agent, $payload['open_db_ports']);
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
                    if (!empty($cfgUpdates)) {
                        $currentConfig->update($cfgUpdates);
                    }
                }
            }

            // Fetch current configuration
            $currentConfig = $agent->currentConfiguration;
            $configVersion = $currentConfig ? $currentConfig->version : 1;
            $agentConfigVersion = (int) ($payload['configuration_version'] ?? 0);

            $globalInterval = (int) \App\Models\Setting::get('heartbeat_interval');
            $response = [
                'heartbeat_interval' => $globalInterval ?: ($currentConfig ? $currentConfig->heartbeat_interval : 5),
                'current_time'       => now()->timestamp,
                'feature_flags'      => [],
                // Always include Reverb credentials so the agent can connect the WS control channel
                // even if bootstrap.json on disk is missing these fields (e.g. due to permissions)
                'server_uuid'        => $server->uuid,
                'update_url'         => url('/api/v1/agent/' . $server->uuid . '/update'),
                'reverb_host'        => env('REVERB_HOST', '127.0.0.1'),
                'reverb_port'        => (int) env('REVERB_PORT', 8080),
                'reverb_scheme'      => env('REVERB_SCHEME', 'http'),
                'reverb_app_key'     => env('REVERB_APP_KEY'),
            ];

            $latestBinaryUpdate = \App\Models\AgentVersion::orderBy('id', 'desc')
                ->first();
            $agentVersion = $agent->version;
            if ($latestBinaryUpdate && $agentVersion !== $latestBinaryUpdate->version) {
                $response['pending_update'] = [
                    'version'            => $latestBinaryUpdate->version,
                    'heartbeat_interval' => null,
                    'binary_url'         => $latestBinaryUpdate->binary_url,
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
                    'sent_at' => now()
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
            // CPU load specs
            if (isset($cpu['load1'])) {
                $samples[] = ['metric_type' => 'cpu', 'metric_name' => 'load1', 'value' => (double) $cpu['load1'], 'unit' => 'load'];
            }
            if (isset($cpu['load5'])) {
                $samples[] = ['metric_type' => 'cpu', 'metric_name' => 'load5', 'value' => (double) $cpu['load5'], 'unit' => 'load'];
            }
            if (isset($cpu['load15'])) {
                $samples[] = ['metric_type' => 'cpu', 'metric_name' => 'load15', 'value' => (double) $cpu['load15'], 'unit' => 'load'];
            }
        }

        // Parse Memory
        if (isset($payload['memory'])) {
            $mem = $payload['memory'];
            if (isset($mem['percent'])) {
                $samples[] = ['metric_type' => 'memory', 'metric_name' => 'percent', 'value' => (double) $mem['percent'], 'unit' => '%'];
            }
            if (isset($mem['used_kb'])) {
                $samples[] = ['metric_type' => 'memory', 'metric_name' => 'used', 'value' => (double) ($mem['used_kb'] / 1024), 'unit' => 'MB'];
            }
            if (isset($mem['total_kb'])) {
                $samples[] = ['metric_type' => 'memory', 'metric_name' => 'total', 'value' => (double) ($mem['total_kb'] / 1024), 'unit' => 'MB'];
            }
        }

        // Parse Disk
        if (isset($payload['disk'])) {
            $disk = $payload['disk'];
            if (isset($disk['percent'])) {
                $samples[] = ['metric_type' => 'disk', 'metric_name' => 'percent', 'value' => (double) $disk['percent'], 'unit' => '%'];
            }
            if (isset($disk['used'])) {
                $samples[] = ['metric_type' => 'disk', 'metric_name' => 'used', 'value' => (double) ($disk['used'] / (1024**3)), 'unit' => 'GB'];
            }
            if (isset($disk['total'])) {
                $samples[] = ['metric_type' => 'disk', 'metric_name' => 'total', 'value' => (double) ($disk['total'] / (1024**3)), 'unit' => 'GB'];
            }
        }

        // Parse Uptime
        if (isset($payload['uptime'])) {
            $samples[] = ['metric_type' => 'uptime', 'metric_name' => 'uptime', 'value' => (double) $payload['uptime'], 'unit' => 'seconds'];
        }

        foreach ($samples as $sample) {
            MetricSample::create(array_merge($sample, [
                'batch_id' => $batch->id,
                'recorded_at' => $recordedAt
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
        \App\Models\ServerUpdate::create([
            'server_id' => $agent->server->id,
            'cpu_usage' => (double) ($payload['cpu']['load1'] ?? 0.0),
            'memory_usage' => (double) ($payload['memory']['percent'] ?? 0.0),
            'storage' => (double) ($payload['disk']['percent'] ?? 0.0),
            'uptime' => (int) ($payload['uptime'] ?? 0),
            'network_rbytes' => $networkRx,
            'network_tbytes' => $networkTx,
            'created_at' => $recordedAt,
        ]);

        // Broadcast stats for UI compatibility (similar to existing server/stats ingest)
        $uiStats = [
            'timestamp' => now()->timestamp,
            'c' => (double) ($payload['cpu']['load1'] ?? 0.0),
            'm' => (double) ($payload['memory']['percent'] ?? 0.0),
            'd' => (double) ($payload['disk']['percent'] ?? 0.0),
            'netIn' => 0.0,
            'netOut' => 0.0,
        ];

        // Trigger real-time stats update broadcast
        ServerStatsUpdated::dispatchSync($agent->server->uuid, $uiStats);
    }

    private function updateServices(Agent $agent, array $services): void
    {
        $identifiers = [];
        foreach ($services as $srv) {
            $identifier = $srv['identifier'] ?? $srv['name'] ?? null;
            if (!$identifier) continue;

            $identifiers[] = $identifier;

            Service::updateOrCreate(
                ['agent_id' => $agent->id, 'identifier' => $identifier],
                [
                    'name' => $srv['name'] ?? $identifier,
                    'state' => $srv['state'] ?? 'unknown',
                    'status' => $srv['status'] ?? null,
                    'last_seen' => now()
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
        $portsList = [];
        foreach ($ports as $port) {
            $portNum = $port['port'] ?? null;
            $proto = $port['protocol'] ?? 'tcp';
            if (is_null($portNum)) continue;

            $portsList[] = ['port' => $portNum, 'proto' => $proto];

            Port::updateOrCreate(
                ['agent_id' => $agent->id, 'protocol' => $proto, 'port' => $portNum],
                [
                    'state' => $port['state'] ?? 'listening',
                    'process_name' => $port['process'] ?? null,
                    'last_seen' => now()
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
            if (!in_array($key, $activeKeys)) {
                $dbPort->update(['state' => 'closed']);
            }
        }
    }

    private function updateProcesses(Agent $agent, array $processes): void
    {
        // Delete old processes first, since it is "current state only"
        Process::where('agent_id', $agent->id)->delete();

        foreach ($processes as $line) {
            if (is_array($line)) {
                Process::create([
                    'agent_id' => $agent->id,
                    'pid' => $line['pid'] ?? 0,
                    'name' => $line['name'] ?? 'unknown',
                    'cpu' => $line['cpu'] ?? 0.0,
                    'memory' => $line['memory'] ?? 0.0,
                    'command_line' => $line['command_line'] ?? null,
                    'last_seen' => now()
                ]);
            } else {
                // Parse line: PID COMM %CPU %MEM
                $parts = preg_split('/\s+/', trim($line));
                if (count($parts) >= 4 && is_numeric($parts[0])) {
                    Process::create([
                        'agent_id' => $agent->id,
                        'pid' => (int) $parts[0],
                        'name' => $parts[1],
                        'cpu' => (double) $parts[2],
                        'memory' => (double) $parts[3],
                        'last_seen' => now()
                    ]);
                }
            }
        }
    }

    private function processCompletedCommands(array $completedCommands): void
    {
        foreach ($completedCommands as $ack) {
            $cmdId = $ack['command_id'] ?? null;
            if (!$cmdId) continue;

            $command = AgentCommand::find($cmdId);
            if (!$command) continue;

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

    private function triggerNodeConfigForServer(Server $server, string $status): void
    {
        $config = NodeConfig::where('slug', 'alerts')->where('enabled', true)->first();
        if (!$config) return;

        $configData = $config->getParsedConfig();
        $nodes = $configData['nodes'] ?? [];

        $sourceNodeId = null;
        foreach ($nodes as $node) {
            if (($node['type'] ?? '') === 'metric' && ($node['settings']['metric_type'] ?? '') === 'server_status') {
                $sourceNodeId = $node['id'];
                break;
            }
        }

        if (!$sourceNodeId) return;

        EvaluateNodeConfig::dispatch($config->id, $sourceNodeId, $status, [
            'server_id' => $server->id,
            'server_name' => $server->name,
            'client_name' => $server->client->name ?? 'Unknown',
            'metric_type' => 'server_status',
        ]);
    }
}
