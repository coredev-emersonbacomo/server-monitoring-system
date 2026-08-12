<?php

namespace App\NodeConfig\Models;

use App\Models\Client;
use App\Models\Server;
use App\Models\User;
use App\NodeConfig\Cache\NodeConfigCache;
use App\NodeConfig\Engine\NodeConfigCompiler;
use App\NodeConfig\Engine\NodeTaskScheduler;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;

class NodeConfig extends Model
{
    protected $table = 'node_configs';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'compiled_config' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (NodeConfig $config) {
            $graph = $config->config ?? ['nodes' => [], 'edges' => []];
            $compiler = new NodeConfigCompiler();
            $config->compiled_config = $compiler->compile($graph);
        });

        static::saved(function (NodeConfig $config) {
            NodeConfigCache::refresh($config);
            static::cancelTasksForScope($config);
        });

        static::deleted(function (NodeConfig $config) {
            NodeConfigCache::invalidate($config);
            static::cancelTasksForScope($config);
        });
    }

    /**
     * Compile the graph into per-metric rules and persist to DB.
     */
    public function compileAndStore(): void
    {
        $graph = $this->config ?? ['nodes' => [], 'edges' => []];
        $compiler = new NodeConfigCompiler();
        $compiled = $compiler->compile($graph);

        $this->updateQuietly(['compiled_config' => $compiled]);
        NodeConfigCache::refresh($this);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'scope_id');
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class, 'scope_id');
    }

    public function getParsedConfig(): array
    {
        return $this->config ?? ['nodes' => [], 'edges' => []];
    }

    public function scopeForGlobal($query)
    {
        return $query->where('scope_type', 'global');
    }

    public function scopeForClient($query, string $clientId)
    {
        return $query->where('scope_type', 'client')->where('scope_id', $clientId);
    }

    public function scopeForServer($query, string $serverId)
    {
        return $query->where('scope_type', 'server')->where('scope_id', $serverId);
    }

    public static function resolveForServer(string $serverUuid): ?self
    {
        return NodeConfigCache::resolveForServer($serverUuid);
    }

    public static function resolveForServerFromDb(string $serverUuid): ?self
    {
        $server = Server::with('client')->where('uuid', $serverUuid)->first();
        if (!$server) return null;

        $scope = $server->alert_scope ?? 'global';

        if ($scope === 'server') {
            $config = static::forServer($server->uuid)->first();
            if ($config && static::hasNodes($config)) return $config;

            if ($server->client) {
                $config = static::forClient($server->client->uuid)->first();
                if ($config && static::hasNodes($config)) return $config;
            }

            return static::forGlobal()->first();
        }

        if ($scope === 'client' && $server->client) {
            $config = static::forClient($server->client->uuid)->first();
            if ($config && static::hasNodes($config)) return $config;
        }

        return static::forGlobal()->first();
    }

    private static function hasNodes(self $config): bool
    {
        return !empty($config->config['nodes'] ?? []);
    }

    public static function cancelTasksForScope(self $config): void
    {
        try {
            $scopeType = $config->scope_type;
            $scopeId = $config->scope_id;

            if ($scopeType === 'global') {
                NodeTaskScheduler::cancelAll();
                return;
            }

            if ($scopeType === 'server') {
                $server = ($scopeId !== null && is_numeric($scopeId))
                    ? Server::find((int) $scopeId)
                    : Server::where('uuid', $scopeId)->first();
                if ($server) {
                    NodeTaskScheduler::cancelByServer($server->id);
                }
                return;
            }

            if ($scopeType === 'client') {
                $client = ($scopeId !== null && is_numeric($scopeId))
                    ? Client::find((int) $scopeId)
                    : Client::where('uuid', $scopeId)->first();
                if ($client) {
                    $affectedServers = Server::where('client_id', $client->id)
                        ->pluck('id');
                    foreach ($affectedServers as $serverId) {
                        NodeTaskScheduler::cancelByServer($serverId);
                    }
                }
                return;
            }
        } catch (\Throwable $e) {
            Log::warning("[node-config] Failed to cancel tasks for scope: " . $e->getMessage());
        }
    }
}
