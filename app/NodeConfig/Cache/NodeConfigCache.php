<?php

namespace App\NodeConfig\Cache;

use App\Models\Server;
use App\NodeConfig\Models\NodeConfig;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class NodeConfigCache
{
    private const PREFIX = 'node_config:';
    private const SCOPE_PREFIX = self::PREFIX . 'scope:';
    private const ID_PREFIX = self::PREFIX . 'id:';
    private const SLUG_PREFIX = self::PREFIX . 'slug:';
    private const INDEX_KEY = self::PREFIX . 'index';
    private const TTL = 3600;

    private static function store()
    {
        return Cache::store(config('cache.default', 'file'));
    }

    public static function warm(): void
    {
        try {
            $configs = NodeConfig::where('enabled', true)->get();

            foreach ($configs as $config) {
                self::storeConfig($config);
            }

            Log::debug('[node-config-cache] Warmed cache with ' . $configs->count() . ' configs');
        } catch (\Throwable $e) {
            Log::warning('[node-config-cache] Failed to warm cache: ' . $e->getMessage());
        }
    }

    public static function refresh(NodeConfig $config): void
    {
        try {
            self::storeConfig($config);
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to refresh config {$config->id}: " . $e->getMessage());
        }
    }

    public static function invalidate(NodeConfig $config): void
    {
        try {
            $store = self::store();

            $scopeKey = self::SCOPE_PREFIX . $config->scope_type;
            if ($config->scope_id) {
                $scopeKey .= ':' . $config->scope_id;
            }

            $store->forget($scopeKey);
            $store->forget(self::ID_PREFIX . $config->id);
            $store->forget(self::SLUG_PREFIX . $config->slug);

            self::rebuildIndex();
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to invalidate config {$config->id}: " . $e->getMessage());
        }
    }

    public static function resolveForServer(string $serverUuid): ?NodeConfig
    {
        try {
            $store = self::store();

            $serverKey = self::SCOPE_PREFIX . 'server:' . $serverUuid;
            $cached = $store->get($serverKey);
            if ($cached) {
                return self::hydrate($cached);
            }

            $server = Server::with('client')->where('uuid', $serverUuid)->first();
            if (!$server) {
                return self::fromCache(self::SCOPE_PREFIX . 'global');
            }

            if ($server->client) {
                $clientKey = self::SCOPE_PREFIX . 'client:' . $server->client->id;
                $cached = $store->get($clientKey);
                if ($cached) {
                    return self::hydrate($cached);
                }
            }

            return self::fromCache(self::SCOPE_PREFIX . 'global');
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to resolve for server {$serverUuid}, falling back to DB: " . $e->getMessage());
            return NodeConfig::resolveForServerFromDb($serverUuid);
        }
    }

    public static function findBySlug(string $slug): ?NodeConfig
    {
        try {
            $store = self::store();
            $configId = $store->get(self::SLUG_PREFIX . $slug);

            if ($configId) {
                $cached = $store->get(self::ID_PREFIX . $configId);
                if ($cached) {
                    return self::hydrate($cached);
                }
            }

            $config = NodeConfig::where('slug', $slug)->where('enabled', true)->first();
            if ($config) {
                self::storeConfig($config);
                return $config;
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to find by slug {$slug}, falling back to DB: " . $e->getMessage());
            return NodeConfig::where('slug', $slug)->where('enabled', true)->first();
        }
    }

    public static function findById(int $id): ?NodeConfig
    {
        try {
            $store = self::store();
            $cached = $store->get(self::ID_PREFIX . $id);

            if ($cached) {
                return self::hydrate($cached);
            }

            $config = NodeConfig::find($id);
            if ($config) {
                self::storeConfig($config);
                return $config;
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to find by id {$id}, falling back to DB: " . $e->getMessage());
            return NodeConfig::find($id);
        }
    }

    public static function hydrate(array $data): NodeConfig
    {
        $model = new NodeConfig($data);
        $model->exists = true;
        return $model;
    }

    private static function storeConfig(NodeConfig $config): void
    {
        $store = self::store();
        $data = $config->toArray();

        $scopeKey = self::SCOPE_PREFIX . $config->scope_type;
        if ($config->scope_id) {
            $scopeKey .= ':' . $config->scope_id;
        }

        $store->put($scopeKey, $data, self::TTL);
        $store->put(self::ID_PREFIX . $config->id, $data, self::TTL);

        if ($config->slug) {
            $store->put(self::SLUG_PREFIX . $config->slug, $config->id, self::TTL);
        }

        self::rebuildIndex();
    }

    private static function fromCache(string $scopeKey): ?NodeConfig
    {
        try {
            $store = self::store();
            $cached = $store->get($scopeKey);

            if ($cached) {
                return self::hydrate($cached);
            }

            return null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private static function rebuildIndex(): void
    {
        try {
            $store = self::store();
            $configs = NodeConfig::where('enabled', true)
                ->select('id', 'scope_type', 'scope_id', 'slug')
                ->get();

            $index = [];
            foreach ($configs as $c) {
                $scopeKey = self::SCOPE_PREFIX . $c->scope_type;
                if ($c->scope_id) {
                    $scopeKey .= ':' . $c->scope_id;
                }
                $index[$c->id] = [
                    'scope_key' => $scopeKey,
                    'slug' => $c->slug,
                ];
            }

            $store->put(self::INDEX_KEY, $index, self::TTL);
        } catch (\Throwable $e) {
            // Index rebuild failure is non-critical
        }
    }
}
