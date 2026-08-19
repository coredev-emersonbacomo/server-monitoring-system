<?php

namespace App\Jobs;

use App\Models\Agent;
use App\Models\Port;
use App\Models\Server;
use App\NodeConfig\Jobs\EvaluateNodeConfig;
use App\NodeConfig\Models\NodeConfig;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class PingServerPorts implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(public Server $server)
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $agent = $this->server->agent;
        if (! $agent) {
            return;
        }

        $host = $this->server->host_name;
        if (! $host) {
            return;
        }

        $ports = static::pingablePorts($this->server, $agent);
        if ($ports->isEmpty()) {
            return;
        }

        foreach ($ports as $port) {
            $startTime = microtime(true);
            $conn = @stream_socket_client(
                "tcp://{$host}:{$port->port}",
                $errno,
                $errstr,
                2.0,
                STREAM_CLIENT_CONNECT,
            );

            if ($conn) {
                fclose($conn);
                $pingTime = (int) round((microtime(true) - $startTime) * 1000);
                $port->update([
                    'ping_status' => 'online',
                    'ping_time' => $pingTime,
                ]);
                $this->evaluateNodeConfig($port, $agent, $pingTime);
            } else {
                $port->update([
                    'ping_status' => 'offline',
                    'ping_time' => null,
                ]);
                $this->evaluateNodeConfig($port, $agent, 'offline');
            }
        }
    }

    /**
     * The TCP ports the ping job is allowed to probe for this server. A null
     * filter means probe every TCP port the agent reports; a non-null list
     * restricts pinging to exactly the SecOps-checked ports (empty = ping
     * nothing). Shared by the dispatch gate and the job itself so both agree.
     */
    public static function pingablePorts(Server $server, Agent $agent): Collection
    {
        $ports = $agent->ports->filter(fn ($p) => $p->protocol === 'tcp');

        $filter = $server->port_filter;
        if (is_array($filter)) {
            $allowed = array_map('intval', $filter);
            $ports = $ports->whereIn('port', $allowed);
        }

        return $ports;
    }

    /**
     * Feed the ping result into the ports_ping metric node (if the resolved
     * config defines one). Numeric timing values go to the timing socket,
     * 'offline' routes to the offline socket.
     */
    private function evaluateNodeConfig(Port $port, Agent $agent, mixed $value): void
    {
        try {
            $config = NodeConfig::resolveForServer($this->server->uuid);
            if (! $config) {
                return;
            }

            $sourceNodeId = $this->findPortsPingNode($config);
            if (! $sourceNodeId) {
                return;
            }

            EvaluateNodeConfig::dispatch($config->id, $sourceNodeId, $value, [
                'server_id' => $this->server->id,
                'server_name' => $this->server->name,
                'client_name' => $this->server->client->name ?? 'Unknown',
                'metric_type' => 'ports_ping',
                'port' => $port->port,
                'port_name' => $port->process_name,
                'protocol' => $port->protocol,
                // built-in template param leaf ids resolvable by the alert system:
                'ping' => is_numeric($value) ? (float) $value : null,
                'name' => $port->process_name,
            ]);
        } catch (\Throwable $e) {
            Log::warning('[ports-ping] Failed to dispatch node config evaluation', [
                'server_id' => $this->server->id,
                'port' => $port->port,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function findPortsPingNode(NodeConfig $config): ?string
    {
        $nodes = $config->getParsedConfig()['nodes'] ?? [];

        foreach ($nodes as $node) {
            if (($node['type'] ?? '') === 'metric' && ($node['settings']['metric_type'] ?? '') === 'ports_ping') {
                return $node['id'];
            }
        }

        return null;
    }
}
