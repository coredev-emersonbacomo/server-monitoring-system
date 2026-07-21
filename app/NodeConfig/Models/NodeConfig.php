<?php

namespace App\NodeConfig\Models;

use App\Models\Client;
use App\Models\Server;
use App\Models\User;
use App\NodeConfig\Cache\NodeConfigCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NodeConfig extends Model
{
    protected $table = 'node_configs';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'compiled_config' => 'array',
            'enabled' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saved(function (NodeConfig $config) {
            NodeConfigCache::refresh($config);
        });

        static::deleted(function (NodeConfig $config) {
            NodeConfigCache::invalidate($config);
        });
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

        $config = static::forServer($server->uuid)->first();
        if ($config) return $config;

        if ($server->client) {
            $config = static::forClient($server->client->uuid)->first();
            if ($config) return $config;
        }

        return static::forGlobal()->first();
    }
}
