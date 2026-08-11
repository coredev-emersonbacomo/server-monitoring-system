<?php

namespace App\Jobs;

use App\Models\Port;
use App\Models\Server;
use App\NodeConfig\Jobs\EvaluateNodeConfig;
use App\NodeConfig\Models\NodeConfig;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
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
        if (!$agent) {
            return;
        }

        $host = $this->server->host_name;
        if (!$host) {
            return;
        }

        $ports = $agent->ports->filter(fn($p) => $p->protocol === 'tcp');
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
     * Feed the ping result into the ports_ping metric node (if the resolved
     * config defines one). Numeric timing values go to the timing socket,
     * 'offline' routes to the offline socket.
     */
    private function evaluateNodeConfig(Port $port, \App\Models\Agent $agent, mixed $value): void
    {
        try {
            $config = NodeConfig::resolveForServer($this->server->uuid);
            if (!$config) {
                return;
            }

            $sourceNodeId = $this->findPortsPingNode($config);
            if (!$sourceNodeId) {
                return;
            }

            EvaluateNodeConfig::dispatch($config->id, $sourceNodeId, $value, [
                'server_id'   => $this->server->id,
                'server_name' => $this->server->name,
                'client_name'   => $this->server->client->name ?? 'Unknown',
                'metric_type'   => 'ports_ping',
                'port'  => $port->port,
                'port_name' => $port->process_name,
                'protocol'  => $port->protocol,
                // built-in template param leaf ids resolvable by the alert system:
                'ping' => is_numeric($value) ? (float) $value : null,
                'name' => $port->process_name,
            ]);
        } catch (\Throwable $e) {
            Log::warning('[ports-ping] Failed to dispatch node config evaluation', [
                'server_id' => $this->server->id,
                'port'      => $port->port,
                'error'     => $e->getMessage(),
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