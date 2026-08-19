<?php

namespace App\NodeConfig\Cache;

use App\NodeConfig\Models\NodeConfig;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class NodeConfigCache
{
    private const PREFIX = 'node_config:';

    private const SCOPE_PREFIX = self::PREFIX.'scope:';

    private const ID_PREFIX = self::PREFIX.'id:';

    private const SLUG_PREFIX = self::PREFIX.'slug:';

    private const COMPILED_PREFIX = self::PREFIX.'compiled:';

    private const INDEX_KEY = self::PREFIX.'index';

    private const TTL = 3600;

    private static function store()
    {
        return Cache::store(config('cache.default', 'file'));
    }

    public static function warm(): void
    {
        try {
            $configs = NodeConfig::get();

            foreach ($configs as $config) {
                self::storeConfig($config);
            }

            // Log::debug('[node-config-cache] Warmed cache with ' . $configs->count() . ' configs');
        } catch (\Throwable $e) {
            Log::warning('[node-config-cache] Failed to warm cache: '.$e->getMessage());
        }
    }

    public static function refresh(NodeConfig $config): void
    {
        try {
            self::storeConfig($config);
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to refresh config {$config->id}: ".$e->getMessage());
        }
    }

    public static function invalidate(NodeConfig $config): void
    {
        try {
            $store = self::store();

            $scopeKey = self::SCOPE_PREFIX.$config->scope_type;
            if ($config->scope_id) {
                $scopeKey .= ':'.$config->scope_id;
            }

            $store->forget($scopeKey);
            $store->forget(self::ID_PREFIX.$config->id);
            $store->forget(self::SLUG_PREFIX.$config->slug);
            $store->forget(self::COMPILED_PREFIX.$config->id);

            self::rebuildIndex();
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to invalidate config {$config->id}: ".$e->getMessage());
        }
    }

    /**
     * Fetch compiled_config from Redis cache. Falls back to DB then null.
     */
    public static function getCompiledConfig(int $configId): ?array
    {
        try {
            $store = self::store();
            $key = self::COMPILED_PREFIX.$configId;
            $cached = $store->get($key);

            if ($cached !== null) {
                return $cached;
            }

            $config = NodeConfig::find($configId);
            if ($config && $config->compiled_config) {
                $store->put($key, $config->compiled_config, self::TTL);

                return $config->compiled_config;
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to get compiled config {$configId}: ".$e->getMessage());

            return NodeConfig::find($configId)?->compiled_config;
        }
    }

    public static function resolveForServer(string $serverUuid): ?NodeConfig
    {
        try {
            $store = self::store();

            $serverKey = self::SCOPE_PREFIX.'server:'.$serverUuid;
            $cached = $store->get($serverKey);
            if ($cached) {
                return self::hydrate($cached);
            }

            $config = NodeConfig::resolveForServerFromDb($serverUuid);
            if ($config) {
                self::storeConfig($config);

                return $config;
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to resolve for server {$serverUuid}, falling back to DB: ".$e->getMessage());

            return NodeConfig::resolveForServerFromDb($serverUuid);
        }
    }

    public static function findBySlug(string $slug): ?NodeConfig
    {
        try {
            $store = self::store();
            $configId = $store->get(self::SLUG_PREFIX.$slug);

            if ($configId) {
                $cached = $store->get(self::ID_PREFIX.$configId);
                if ($cached) {
                    return self::hydrate($cached);
                }
            }

            $config = NodeConfig::where('slug', $slug)->first();
            if ($config) {
                self::storeConfig($config);

                return $config;
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning("[node-config-cache] Failed to find by slug {$slug}, falling back to DB: ".$e->getMessage());

            return NodeConfig::where('slug', $slug)->first();
        }
    }

    public static function findById(int $id): ?NodeConfig
    {
        try {
            $store = self::store();
            $cached = $store->get(self::ID_PREFIX.$id);

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
            Log::warning("[node-config-cache] Failed to find by id {$id}, falling back to DB: ".$e->getMessage());

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

        $scopeKey = self::SCOPE_PREFIX.$config->scope_type;
        if ($config->scope_id) {
            $scopeKey .= ':'.$config->scope_id;
        }

        $store->put($scopeKey, $data, self::TTL);
        $store->put(self::ID_PREFIX.$config->id, $data, self::TTL);

        if ($config->slug) {
            $store->put(self::SLUG_PREFIX.$config->slug, $config->id, self::TTL);
        }

        // Cache compiled_config separately for fast engine fetch
        if ($config->compiled_config) {
            $store->put(self::COMPILED_PREFIX.$config->id, $config->compiled_config, self::TTL);
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
            $configs = NodeConfig::select('id', 'scope_type', 'scope_id', 'slug')
                ->get();

            $index = [];
            foreach ($configs as $c) {
                $scopeKey = self::SCOPE_PREFIX.$c->scope_type;
                if ($c->scope_id) {
                    $scopeKey .= ':'.$c->scope_id;
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
