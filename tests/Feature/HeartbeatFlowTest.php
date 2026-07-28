<?php

namespace Tests\Feature;

use App\Enums\ServerHealth;
use App\Enums\ServerStatus;
use App\Models\Agent;
use App\Models\AgentIdentity;
use App\Models\Client;
use App\Models\Heartbeat;
use App\Models\MetricBatch;
use App\Models\MetricSample;
use App\Models\Server;
use App\Models\Setting;
use App\NodeConfig\Cache\NodeConfigCache;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Models\NodeConfig;
use App\Services\HeartbeatService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\TestCase;

class HeartbeatFlowTest extends TestCase
{
    use RefreshDatabase;

    private Client $client;
    private Server $server;
    private Agent $agent;
    private AgentIdentity $identity;
    private NodeConfig $alertsConfig;

    protected function setUp(): void
    {
        parent::setUp();

        Setting::create(['key' => 'offline_threshold', 'value' => '15']);
        Setting::create(['key' => 'heartbeat_interval', 'value' => '5']);

        $this->client = Client::create([
            'name' => 'Test Client Corp',
            'email' => 'test@example.com',
            'location' => 'US East',
            'alert_scope' => 'global',
        ]);

        $this->server = Server::create([
            'uuid' => Str::uuid7()->toString(),
            'client_id' => $this->client->id,
            'name' => 'prod-web-01',
            'host_name' => 'prod-web-01.internal',
            'status' => ServerStatus::Offline->value,
            'alert_scope' => 'global',
        ]);

        $this->agent = Agent::create([
            'server_id' => $this->server->id,
            'version' => '1.0.0',
            'protocol_version' => '1',
            'status' => 'online',
            'last_seen_at' => now()->subMinutes(30),
        ]);

        $this->identity = AgentIdentity::create([
            'agent_id' => $this->agent->id,
            'identity_hash' => hash('sha256', 'test-identity-' . uniqid()),
            'status' => 'active',
        ]);

        $this->seedAlertConfig();
    }

    private function seedAlertConfig(): void
    {
        $nodes = [
            ['id' => 'metric_cpu', 'type' => 'metric', 'settings' => ['label' => 'CPU Usage', 'metric_type' => 'cpu_usage']],
            ['id' => 'metric_memory', 'type' => 'metric', 'settings' => ['label' => 'Memory Usage', 'metric_type' => 'memory_usage']],
            ['id' => 'metric_disk', 'type' => 'metric', 'settings' => ['label' => 'Disk Usage', 'metric_type' => 'disk_usage']],
            ['id' => 'metric_status', 'type' => 'metric', 'settings' => ['label' => 'Server Status', 'metric_type' => 'server_status']],

            ['id' => 'compare_85', 'type' => 'condition', 'settings' => ['label' => '>= 85%', 'operator' => 'greater_than', 'threshold' => 85, 'min' => 0, 'max' => 0]],

            ['id' => 'sustained_10', 'type' => 'sustained', 'settings' => ['label' => 'Sustained 10m', 'duration' => '600000']],

            ['id' => 'email_10', 'type' => 'notification', 'settings' => ['label' => 'Email 10m', 'channel' => 'email', 'subject' => '[{server.client.name}] {server.name} - {metricName} Alert (10m)', 'message' => '[{server.client.name}] {server.name}\'s {metricName} has been above 85% for {sustainValue}!']],
            ['id' => 'email_offline', 'type' => 'notification', 'settings' => ['label' => 'Email Offline', 'channel' => 'email', 'subject' => '[{server.client.name}] {server.name} - Offline Alert', 'message' => '[{server.client.name}] {server.name} is offline!']],

            ['id' => 'check_after_10m', 'type' => 'check_after', 'settings' => ['label' => 'Check After 10m', 'duration' => '600000']],
            ['id' => 'discord_offline', 'type' => 'notification', 'settings' => ['label' => 'Discord Offline', 'channel' => 'discord', 'message' => ':rotating_light: [{server.client.name}] {server.name} is still offline! (for {runtime.offlineDuration})']],
            ['id' => 'repeat_5m', 'type' => 'repeat', 'settings' => ['label' => 'Repeat 5m', 'interval' => '300000']],

            ['id' => 'discord_30', 'type' => 'notification', 'settings' => ['label' => 'Discord 30m', 'channel' => 'discord', 'message' => ':rotating_light: CPU high for 30m']],
            ['id' => 'repeat_10', 'type' => 'repeat', 'settings' => ['label' => 'Repeat 10m', 'interval' => '600000']],
        ];

        $edges = [
            ['id' => 'e_cpu_85', 'source' => 'metric_cpu', 'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
            ['id' => 'e_85_s10', 'source' => 'compare_85', 'target' => 'sustained_10', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_s10_email10', 'source' => 'sustained_10', 'target' => 'email_10', 'sourceHandle' => 'output', 'targetHandle' => 'input'],

            ['id' => 'e_off_email', 'source' => 'metric_status', 'target' => 'email_offline', 'sourceHandle' => 'offline', 'targetHandle' => 'input'],
            ['id' => 'e_off_check', 'source' => 'metric_status', 'target' => 'check_after_10m', 'sourceHandle' => 'offline', 'targetHandle' => 'input'],
            ['id' => 'e_check_discord', 'source' => 'check_after_10m', 'target' => 'discord_offline', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_discord_repeat', 'source' => 'discord_offline', 'target' => 'repeat_5m', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
        ];

        $this->alertsConfig = NodeConfig::create([
            'name' => 'Default Alerts',
            'slug' => 'alerts',
            'config' => ['nodes' => $nodes, 'edges' => $edges],
            'enabled' => true,
            'scope_type' => 'global',
        ]);

        NodeConfigCache::warm();
    }

    private function createRegistry(): NodeRegistry
    {
        $registry = new NodeRegistry();
        $registry->register(new \App\NodeConfig\NodeTypes\MetricNode);
        $registry->register(new \App\NodeConfig\NodeTypes\ConditionNode);
        $registry->register(new \App\NodeConfig\NodeTypes\LogicNode);
        $registry->register(new \App\NodeConfig\NodeTypes\CheckAfterNode);
        $registry->register(new \App\NodeConfig\NodeTypes\SustainedNode);
        $registry->register(new \App\NodeConfig\NodeTypes\RepeatNode);
        $registry->register(new \App\NodeConfig\NodeTypes\NotificationNode);
        return $registry;
    }

    private function ingestMetricSample(string $metricType, string $metricName, float $value): void
    {
        $batch = MetricBatch::create([
            'agent_id' => $this->agent->id,
            'collector_version' => '1.0.0',
        ]);

        MetricSample::create([
            'batch_id' => $batch->id,
            'metric_type' => $metricType,
            'metric_name' => $metricName,
            'value' => $value,
            'unit' => $metricType === 'cpu' ? 'load' : '%',
            'recorded_at' => now(),
        ]);
    }

    // ──────────────────────────────────────────────────────
    // TEST 1: Cache read/write works
    // ──────────────────────────────────────────────────────

    public function test_cache_stores_and_retrieves_config(): void
    {
        $config = NodeConfigCache::findBySlug('alerts');
        $this->assertNotNull($config, 'Config should be retrievable from cache');
        $this->assertEquals($this->alertsConfig->id, $config->id);
        $this->assertEquals('Default Alerts', $config->name);
        $this->assertTrue($config->enabled);

        $nodes = $config->getParsedConfig()['nodes'] ?? [];
        $this->assertCount(13, $nodes, 'Config should have 13 nodes');
    }

    public function test_cache_resolve_for_server(): void
    {
        $resolved = NodeConfigCache::resolveForServer($this->server->uuid);
        $this->assertNotNull($resolved, 'resolveForServer should return global config');
        $this->assertEquals($this->alertsConfig->id, $resolved->id);
    }

    public function test_cache_invalidation_on_delete(): void
    {
        $config = NodeConfigCache::findBySlug('alerts');
        $this->assertNotNull($config);

        $config->delete();

        $configAgain = NodeConfigCache::findBySlug('alerts');
        $this->assertNull($configAgain, 'Config should be null after deletion');
    }

    // ──────────────────────────────────────────────────────
    // TEST 2: CPU Usage High triggers sustained -> email
    // ──────────────────────────────────────────────────────

    public function test_cpu_high_triggers_email_alert(): void
    {
        Log::info('[TEST] === CPU Usage High Test ===');

        $registry = $this->createRegistry();
        $engine = new NodeConfigEngine($registry);

        $config = NodeConfigCache::findBySlug('alerts');
        $this->assertNotNull($config);

        $this->ingestMetricSample('cpu', 'load1', 92.5);

        $sourceNodeId = null;
        foreach ($config->getParsedConfig()['nodes'] as $node) {
            if (($node['type'] ?? '') === 'metric' && ($node['settings']['metric_type'] ?? '') === 'cpu_usage') {
                $sourceNodeId = $node['id'];
                break;
            }
        }
        $this->assertEquals('metric_cpu', $sourceNodeId);

        Log::info("[TEST] Triggering cpu_usage with value 92.5 from node: {$sourceNodeId}");

        $result = $engine->trigger($config, $sourceNodeId, 92.5, [
            'server_id' => $this->server->id,
            'server_name' => $this->server->name,
            'client_name' => $this->client->name,
            'metric_type' => 'cpu_usage',
        ]);

        Log::info("[TEST] Engine result:", [
            'success' => $result['success'],
            'actions_count' => count($result['actions']),
            'timers_count' => count($result['timers']),
        ]);

        $this->assertTrue($result['success'], 'Engine should succeed');

        if (!empty($result['actions'])) {
            foreach ($result['actions'] as $action) {
                Log::info("[TEST] Action dispatched:", [
                    'node_id' => $action['node_id'],
                    'type' => $action['type'],
                    'channel' => $action['settings']['channel'] ?? 'unknown',
                    'subject' => $action['settings']['subject'] ?? '',
                ]);
            }
        }

        if (!empty($result['timers'])) {
            foreach ($result['timers'] as $timer) {
                Log::info("[TEST] Timer scheduled:", [
                    'node_id' => $timer['node_id'],
                    'delay_ms' => $timer['delay_ms'],
                ]);

                $timerResult = $engine->fireTimer($config, $timer['node_id'], array_merge($timer['context'], [
                    'server_id' => $this->server->id,
                    'server_name' => $this->server->name,
                    'client_name' => $this->client->name,
                    'metric_type' => 'cpu_usage',
                ]));

                Log::info("[TEST] Timer fire result:", [
                    'success' => $timerResult['success'],
                    'propagated' => $timerResult['propagated'] ?? false,
                    'actions_count' => count($timerResult['actions'] ?? []),
                ]);

                if (!empty($timerResult['actions'])) {
                    foreach ($timerResult['actions'] as $action) {
                        Log::info("[TEST] Timer action:", [
                            'node_id' => $action['node_id'],
                            'type' => $action['type'],
                            'channel' => $action['settings']['channel'] ?? 'unknown',
                        ]);
                    }
                }
            }
        }

        $this->assertNotEmpty($result['actions'], 'Should trigger email notification for high CPU');
        $emailAction = collect($result['actions'])->first(fn($a) => ($a['settings']['channel'] ?? '') === 'email');
        $this->assertNotNull($emailAction, 'Should have an email notification action');
        $this->assertEquals('email_10', $emailAction['node_id']);
    }

    // ──────────────────────────────────────────────────────
    // TEST 3: CPU normal should NOT trigger alert
    // ──────────────────────────────────────────────────────

    public function test_cpu_normal_does_not_trigger(): void
    {
        Log::info('[TEST] === CPU Normal Value Test ===');

        $registry = $this->createRegistry();
        $engine = new NodeConfigEngine($registry);

        $config = NodeConfigCache::findBySlug('alerts');

        $result = $engine->trigger($config, 'metric_cpu', 45.0, [
            'server_id' => $this->server->id,
            'server_name' => $this->server->name,
            'client_name' => $this->client->name,
            'metric_type' => 'cpu_usage',
        ]);

        Log::info("[TEST] CPU 45.0 result:", [
            'success' => $result['success'],
            'actions_count' => count($result['actions']),
        ]);

        $this->assertTrue($result['success']);
        $this->assertEmpty($result['actions'], 'Should NOT trigger notification for normal CPU');
    }

    // ──────────────────────────────────────────────────────
    // TEST 4: Server offline triggers email + check_after
    // ──────────────────────────────────────────────────────

    public function test_server_offline_triggers_email_and_check_after(): void
    {
        Log::info('[TEST] === Server Offline Test ===');

        $registry = $this->createRegistry();
        $engine = new NodeConfigEngine($registry);

        $config = NodeConfigCache::findBySlug('alerts');

        $sourceNodeId = null;
        foreach ($config->getParsedConfig()['nodes'] as $node) {
            if (($node['type'] ?? '') === 'metric' && ($node['settings']['metric_type'] ?? '') === 'server_status') {
                $sourceNodeId = $node['id'];
                break;
            }
        }
        $this->assertEquals('metric_status', $sourceNodeId);

        Log::info("[TEST] Triggering server_status=offline from node: {$sourceNodeId}");

        $result = $engine->trigger($config, $sourceNodeId, 'offline', [
            'server_id' => $this->server->id,
            'server_name' => $this->server->name,
            'client_name' => $this->client->name,
            'metric_type' => 'server_status',
        ]);

        Log::info("[TEST] Offline trigger result:", [
            'success' => $result['success'],
            'actions_count' => count($result['actions']),
            'timers_count' => count($result['timers']),
        ]);

        foreach ($result['actions'] as $action) {
            Log::info("[TEST] Offline action:", [
                'node_id' => $action['node_id'],
                'type' => $action['type'],
                'channel' => $action['settings']['channel'] ?? 'unknown',
                'subject' => $action['settings']['subject'] ?? '',
            ]);
        }

        foreach ($result['timers'] as $timer) {
            Log::info("[TEST] Offline timer:", [
                'node_id' => $timer['node_id'],
                'delay_ms' => $timer['delay_ms'],
            ]);
        }

        $this->assertTrue($result['success']);
        $this->assertNotEmpty($result['actions'], 'Offline should trigger immediate email');

        $emailAction = collect($result['actions'])->first(fn($a) => $a['node_id'] === 'email_offline');
        $this->assertNotNull($emailAction, 'Should have email_offline action');
        $this->assertEquals('email', $emailAction['settings']['channel']);

        $checkTimer = collect($result['timers'])->first(fn($t) => $t['node_id'] === 'check_after_10m');
        $this->assertNotNull($checkTimer, 'Should schedule check_after_10m timer');
        $this->assertEquals(600000, $checkTimer['delay_ms'], 'Timer should be 10 minutes (600000ms)');

        Log::info("[TEST] Firing check_after_10m timer...");

        $timerResult = $engine->fireTimer($config, 'check_after_10m', array_merge($checkTimer['context'], [
            'server_id' => $this->server->id,
            'server_name' => $this->server->name,
            'client_name' => $this->client->name,
            'metric_type' => 'server_status',
        ]));

        Log::info("[TEST] check_after_10m fire result:", [
            'success' => $timerResult['success'],
            'propagated' => $timerResult['propagated'] ?? false,
            'actions_count' => count($timerResult['actions'] ?? []),
            'timers_count' => count($timerResult['timers'] ?? []),
        ]);

        if (!empty($timerResult['actions'])) {
            foreach ($timerResult['actions'] as $action) {
                Log::info("[TEST] check_after action:", [
                    'node_id' => $action['node_id'],
                    'type' => $action['type'],
                    'channel' => $action['settings']['channel'] ?? 'unknown',
                ]);
            }
        }

        if (!empty($timerResult['timers'])) {
            foreach ($timerResult['timers'] as $innerTimer) {
                Log::info("[TEST] check_after downstream timer:", [
                    'node_id' => $innerTimer['node_id'],
                    'delay_ms' => $innerTimer['delay_ms'],
                ]);

                $repeatResult = $engine->fireTimer($config, $innerTimer['node_id'], array_merge($innerTimer['context'], [
                    'server_id' => $this->server->id,
                    'server_name' => $this->server->name,
                    'client_name' => $this->client->name,
                    'metric_type' => 'server_status',
                ]));

                Log::info("[TEST] repeat fire result:", [
                    'success' => $repeatResult['success'],
                    'propagated' => $repeatResult['propagated'] ?? false,
                    'actions_count' => count($repeatResult['actions'] ?? []),
                    'timers_count' => count($repeatResult['timers'] ?? []),
                ]);

                if (!empty($repeatResult['timers'])) {
                    foreach ($repeatResult['timers'] as $repeatTimer) {
                        Log::info("[TEST] repeat_5m next timer scheduled:", [
                            'node_id' => $repeatTimer['node_id'],
                            'delay_ms' => $repeatTimer['delay_ms'],
                        ]);
                    }
                }
            }
        }

        $this->assertTrue($timerResult['success'] || ($timerResult['propagated'] ?? false),
            'check_after timer should fire and propagate');
    }

    // ──────────────────────────────────────────────────────
    // TEST 5: Server online should NOT trigger alerts
    // ──────────────────────────────────────────────────────

    public function test_server_online_does_not_trigger(): void
    {
        Log::info('[TEST] === Server Online Test ===');
        Log::info("[TEST] Cache store: " . config('cache.default'));

        $registry = $this->createRegistry();
        $engine = new NodeConfigEngine($registry);

        $config = NodeConfigCache::findBySlug('alerts');
        Log::info("[TEST] Config loaded: " . ($config ? $config->name : 'null'));

        $result = $engine->trigger($config, 'metric_status', 'online', [
            'server_id' => $this->server->id,
            'server_name' => $this->server->name,
            'client_name' => $this->client->name,
            'metric_type' => 'server_status',
        ]);

        Log::info("[TEST] Server online result:", [
            'success' => $result['success'],
            'actions_count' => count($result['actions']),
        ]);

        if (!empty($result['actions'])) {
            foreach ($result['actions'] as $i => $action) {
                Log::info("[TEST] Action[$i]:", [
                    'node_id' => $action['node_id'],
                    'type' => $action['type'],
                    'channel' => $action['settings']['channel'] ?? 'unknown',
                    'value' => $action['value'],
                ]);
            }
        }

        if (!empty($result['outputs'])) {
            Log::info("[TEST] Outputs:", $result['outputs']);
        }

        $this->assertTrue($result['success']);

        $actionNodeIds = array_column($result['actions'], 'node_id');
        $hasOfflineAction = in_array('email_offline', $actionNodeIds);
        $this->assertFalse($hasOfflineAction, 'Online server should NOT trigger email_offline');
    }

    // ──────────────────────────────────────────────────────
    // TEST 6: Full resolveForServer flow
    // ──────────────────────────────────────────────────────

    public function test_resolve_for_server_uses_cache(): void
    {
        Log::info('[TEST] === resolveForServer Cache Test ===');

        $resolved = NodeConfig::resolveForServer($this->server->uuid);
        $this->assertNotNull($resolved);
        $this->assertEquals($this->alertsConfig->id, $resolved->id);

        Log::info("[TEST] resolveForServer returned config: {$resolved->name} (ID: {$resolved->id})");

        $nodes = $resolved->getParsedConfig()['nodes'] ?? [];
        $metricNodes = array_filter($nodes, fn($n) => ($n['type'] ?? '') === 'metric');
        Log::info("[TEST] Config has " . count($metricNodes) . " metric nodes");

        foreach ($metricNodes as $mn) {
            Log::info("[TEST]   - {$mn['id']}: {$mn['settings']['metric_type']}");
        }
    }

    // ──────────────────────────────────────────────────────
    // TEST 7: Cache refresh on config update
    // ──────────────────────────────────────────────────────

    public function test_cache_updates_when_config_changes(): void
    {
        Log::info('[TEST] === Cache Update on Config Change ===');

        $config = NodeConfigCache::findBySlug('alerts');
        $originalNodeCount = count($config->getParsedConfig()['nodes'] ?? []);
        Log::info("[TEST] Original node count: {$originalNodeCount}");

        $newNodes = $config->getParsedConfig()['nodes'];
        $newNodes[] = [
            'id' => 'metric_extra',
            'type' => 'metric',
            'settings' => ['label' => 'Extra Metric', 'metric_type' => 'heartbeat_age'],
        ];

        $config->update(['config' => ['nodes' => $newNodes, 'edges' => $config->getParsedConfig()['edges'] ?? []]]);

        $refreshed = NodeConfigCache::findBySlug('alerts');
        $newCount = count($refreshed->getParsedConfig()['nodes'] ?? []);
        Log::info("[TEST] Updated node count: {$newCount}");

        $this->assertEquals($originalNodeCount + 1, $newCount, 'Cache should reflect the added node');

        $config->update(['config' => ['nodes' => array_slice($newNodes, 0, -1), 'edges' => $config->getParsedConfig()['edges'] ?? []]]);
    }
}
