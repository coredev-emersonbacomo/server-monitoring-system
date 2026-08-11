<?php

namespace Tests\Unit;

use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\Models\NodeConfigState;
use App\NodeConfig\NodeTypes\CheckAfterNode;
use App\NodeConfig\NodeTypes\ConditionNode;
use App\NodeConfig\NodeTypes\LogicNode;
use App\NodeConfig\NodeTypes\MetricNode;
use App\NodeConfig\NodeTypes\NotificationNode;
use App\NodeConfig\NodeTypes\RepeatNode;
use App\NodeConfig\NodeTypes\SustainedNode;
use App\NodeConfig\NodeTypes\TemplateNode;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class NodeConfigEngineHandleTest extends TestCase
{
    use RefreshDatabase;

    private NodeConfigEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();

        $registry = new NodeRegistry();
        $registry->register(new MetricNode);
        $registry->register(new ConditionNode);
        $registry->register(new LogicNode);
        $registry->register(new CheckAfterNode);
        $registry->register(new SustainedNode);
        $registry->register(new RepeatNode);
         $registry->register(new NotificationNode);
        $registry->register(new TemplateNode);

        $this->engine = new NodeConfigEngine($registry);
    }

    private function createConfig(array $configData): NodeConfig
    {
        return NodeConfig::create([
            'name' => 'Test Config',
            'config' => $configData,
            'scope_type' => 'global',
        ]);
    }

    public function test_notification_to_repeat_with_out_handle(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'metric', 'type' => 'metric', 'settings' => ['metric_type' => 'cpu_usage']],
                ['id' => 'compare', 'type' => 'condition', 'settings' => ['operator' => 'greater_than', 'threshold' => 85]],
                ['id' => 'notify', 'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => 'Test', 'message' => 'Test']],
                ['id' => 'repeat', 'type' => 'repeat', 'settings' => ['interval' => '300000']],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'metric', 'target' => 'compare', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e2', 'source' => 'compare', 'target' => 'notify', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e3', 'source' => 'notify', 'target' => 'repeat', 'sourceHandle' => 'out', 'targetHandle' => 'input'],
            ],
        ]);

        $result = $this->engine->trigger($config, 'metric', 92.5, [
            'server_id' => 1,
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'cpu_usage',
        ]);

        $this->assertTrue($result['success']);
        $this->assertNotEmpty($result['actions'], 'Notification should fire when metric > threshold');
        $this->assertNotEmpty($result['timers'], 'Repeat should schedule a timer');
        $this->assertEquals('repeat', $result['timers'][0]['node_id']);
    }

    public function test_notification_to_repeat_with_output_handle(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'metric', 'type' => 'metric', 'settings' => ['metric_type' => 'cpu_usage']],
                ['id' => 'compare', 'type' => 'condition', 'settings' => ['operator' => 'greater_than', 'threshold' => 85]],
                ['id' => 'notify', 'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => 'Test', 'message' => 'Test']],
                ['id' => 'repeat', 'type' => 'repeat', 'settings' => ['interval' => '300000']],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'metric', 'target' => 'compare', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e2', 'source' => 'compare', 'target' => 'notify', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e3', 'source' => 'notify', 'target' => 'repeat', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ],
        ]);

        $result = $this->engine->trigger($config, 'metric', 92.5, [
            'server_id' => 1,
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'cpu_usage',
        ]);

        $this->assertTrue($result['success']);
        $this->assertNotEmpty($result['actions']);
        $this->assertNotEmpty($result['timers']);
    }

    public function test_check_after_to_notification_to_repeat_with_out_handle(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'status', 'type' => 'metric', 'settings' => ['metric_type' => 'server_status']],
                ['id' => 'check', 'type' => 'check_after', 'settings' => ['duration' => '600000']],
                ['id' => 'notify', 'type' => 'notification', 'settings' => ['channel' => 'discord', 'message' => 'Still offline']],
                ['id' => 'repeat', 'type' => 'repeat', 'settings' => ['interval' => '300000']],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'status', 'target' => 'check', 'sourceHandle' => 'offline', 'targetHandle' => 'input'],
                ['id' => 'e2', 'source' => 'check', 'target' => 'notify', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e3', 'source' => 'notify', 'target' => 'repeat', 'sourceHandle' => 'out', 'targetHandle' => 'input'],
            ],
        ]);

        $result = $this->engine->trigger($config, 'status', 'offline', [
            'server_id' => 1,
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'server_status',
        ]);

        $this->assertTrue($result['success']);
        $this->assertNotEmpty($result['timers'], 'CheckAfter should schedule a timer');
        $this->assertEquals('check', $result['timers'][0]['node_id']);
    }

    public function test_metric_server_status_multi_output(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'status', 'type' => 'metric', 'settings' => ['metric_type' => 'server_status']],
                ['id' => 'email_off', 'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => 'Offline', 'message' => 'Server is offline']],
                ['id' => 'email_on', 'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => 'Online', 'message' => 'Server is online']],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'status', 'target' => 'email_off', 'sourceHandle' => 'offline', 'targetHandle' => 'input'],
                ['id' => 'e2', 'source' => 'status', 'target' => 'email_on', 'sourceHandle' => 'online', 'targetHandle' => 'input'],
            ],
        ]);

        $resultOffline = $this->engine->trigger($config, 'status', 'offline', [
            'server_id' => 1,
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'server_status',
        ]);

        $this->assertTrue($resultOffline['success']);
        $this->assertCount(1, $resultOffline['actions']);
        $this->assertEquals('email_off', $resultOffline['actions'][0]['node_id']);

        NodeConfig::unguard();
        NodeConfig::where('id', $config->id)->update(['config' => $config->config]);
        NodeConfig::reguard();

        $resultOnline = $this->engine->trigger($config, 'status', 'online', [
            'server_id' => 1,
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'server_status',
        ]);

        $this->assertTrue($resultOnline['success']);
        $this->assertCount(1, $resultOnline['actions']);
        $this->assertEquals('email_on', $resultOnline['actions'][0]['node_id']);
    }

    public function test_ports_ping_timing_and_offline_sockets(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'metric_ports',  'type' => 'metric',       'settings' => ['metric_type' => 'ports_ping']],
                ['id' => 'compare_ping',  'type' => 'condition',    'settings' => ['operator' => 'greater_than', 'threshold' => 200]],
                ['id' => 'sustained_ping','type' => 'sustained',    'settings' => ['duration' => '10000']],
                ['id' => 'check_ping',    'type' => 'check_after',  'settings' => ['duration' => '10000']],
                ['id' => 'notify_slow',   'type' => 'notification', 'settings' => ['channel' => 'discord', 'message' => 'Slow {runtime.port}']],
                ['id' => 'notify_off',    'type' => 'notification', 'settings' => ['channel' => 'discord', 'message' => 'Unreachable {runtime.port}']],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'metric_ports', 'target' => 'compare_ping', 'sourceHandle' => 'timing', 'targetHandle' => 'input-a'],
                ['id' => 'e2', 'source' => 'compare_ping', 'target' => 'sustained_ping', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e3', 'source' => 'sustained_ping', 'target' => 'notify_slow', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e4', 'source' => 'metric_ports', 'target' => 'check_ping', 'sourceHandle' => 'offline', 'targetHandle' => 'input'],
                ['id' => 'e5', 'source' => 'check_ping', 'target' => 'notify_off', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ],
        ]);

        $base = ['server_id' => 1, 'server_name' => 'TestServer', 'client_name' => 'TestClient', 'metric_type' => 'ports_ping', 'port' => 5432];

        // High ping time → timing socket arms the sustain timer (no immediate action)
        $slow = $this->engine->trigger($config, 'metric_ports', 500, $base);
        $this->assertTrue($slow['success']);
        $this->assertEmpty($slow['actions']);
        $this->assertNotEmpty($slow['timers']);
        $this->assertEquals('sustained_ping', $slow['timers'][0]['node_id']);

        NodeConfigState::where('node_config_id', $config->id)->delete();

        // Low ping time → timing condition fails, no timer
        $fast = $this->engine->trigger($config, 'metric_ports', 50, $base);
        $this->assertEmpty($fast['timers']);
        $this->assertEmpty($fast['actions']);

        NodeConfigState::where('node_config_id', $config->id)->delete();

        // Unreachable → offline socket arms the check_after timer
        $off = $this->engine->trigger($config, 'metric_ports', 'offline', $base);
        $this->assertEmpty($off['actions']);
        $this->assertNotEmpty($off['timers']);
        $this->assertEquals('check_ping', $off['timers'][0]['node_id']);
    }

    public function test_port_ping_slow_threshold_is_resolved_via_template_override(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'metric_ports',  'type' => 'metric',       'settings' => ['metric_type' => 'ports_ping']],
                ['id' => 'compare_ping',  'type' => 'condition',    'settings' => ['operator' => 'greater_than', 'threshold' => 200]],
                ['id' => 'ping_slow_threshold', 'type' => 'template', 'settings' => ['template_id' => 'port_ping_slow_threshold_ms', 'value' => '200', 'data_type' => 'number']],
                ['id' => 'sustained_ping', 'type' => 'sustained',  'settings' => ['duration' => '10000']],
                ['id' => 'notify_slow',   'type' => 'notification', 'settings' => ['channel' => 'discord', 'message' => 'Slow {runtime.port}']],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'metric_ports', 'target' => 'compare_ping', 'sourceHandle' => 'timing', 'targetHandle' => 'input-a'],
                ['id' => 'e2', 'source' => 'ping_slow_threshold', 'target' => 'compare_ping', 'sourceHandle' => 'output', 'targetHandle' => 'input-b'],
                ['id' => 'e3', 'source' => 'compare_ping', 'target' => 'sustained_ping', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e4', 'source' => 'sustained_ping', 'target' => 'notify_slow', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ],
        ]);

        $base = ['server_id' => 1, 'server_name' => 'TestServer', 'client_name' => 'TestClient', 'metric_type' => 'ports_ping', 'port' => 5432];

        // 500ms ping, alert-system override to 600ms → 500 < 600 → NOT slow (no timer).
        $notSlow = $this->engine->trigger($config, 'metric_ports', 500, array_merge($base, ['port_ping_slow_threshold_ms' => 600]));
        $this->assertEmpty($notSlow['timers'], '500ms below overridden 600ms threshold should not arm sustain');

        NodeConfigState::where('node_config_id', $config->id)->delete();

        // 500ms ping, alert-system override down to 100ms → 500 > 100 → slow.
        $slow = $this->engine->trigger($config, 'metric_ports', 500, array_merge($base, ['port_ping_slow_threshold_ms' => 100]));
        $this->assertTrue($slow['success']);
        $this->assertNotEmpty($slow['timers'], '500ms above overridden 100ms threshold should arm sustain');
        $this->assertEquals('sustained_ping', $slow['timers'][0]['node_id']);

        NodeConfigState::where('node_config_id', $config->id)->delete();

        // No alert-system injection → node default value (200) used; 150ms < 200 → NOT slow.
        $stillSlow = $this->engine->trigger($config, 'metric_ports', 150, $base);
        $this->assertEmpty($stillSlow['timers'], '150ms below node default 200ms should not arm sustain');

        NodeConfigState::where('node_config_id', $config->id)->delete();

        // No injection → default 200; 350ms > 200 → slow.
        $defSlow = $this->engine->trigger($config, 'metric_ports', 350, $base);
        $this->assertNotEmpty($defSlow['timers'], '350ms above node default 200ms should arm sustain');
        $this->assertEquals('sustained_ping', $defSlow['timers'][0]['node_id']);
    }

    public function test_disk_metric_evaluates_condition_true_and_schedules_sustained(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'metric_cpu',     'type' => 'metric',     'settings' => ['metric_type' => 'cpu_usage']],
                ['id' => 'metric_memory',  'type' => 'metric',     'settings' => ['metric_type' => 'memory_usage']],
                ['id' => 'metric_disk',    'type' => 'metric',     'settings' => ['metric_type' => 'disk_usage']],
                ['id' => 'metric_network', 'type' => 'metric',     'settings' => ['metric_type' => 'network_usage']],

                ['id' => 'compare_85',     'type' => 'condition',  'settings' => ['operator' => 'greater_than_equal', 'threshold' => 85]],

                ['id' => 'sustained_10',   'type' => 'sustained',  'settings' => ['duration' => '10000']],
                ['id' => 'sustained_20',   'type' => 'sustained',  'settings' => ['duration' => '20000']],
                ['id' => 'sustained_30',   'type' => 'sustained',  'settings' => ['duration' => '30000']],

                ['id' => 'email_10',       'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => '10s']],
                ['id' => 'email_20',       'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => '20s']],
                ['id' => 'discord_30',     'type' => 'notification', 'settings' => ['channel' => 'discord', 'message' => '30s']],
            ],
            'edges' => [
                ['id' => 'e_cpu',  'source' => 'metric_cpu',     'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e_mem',  'source' => 'metric_memory',  'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e_disk', 'source' => 'metric_disk',    'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e_net',  'source' => 'metric_network', 'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],

                ['id' => 'e_c_s10', 'source' => 'compare_85', 'target' => 'sustained_10', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e_c_s20', 'source' => 'compare_85', 'target' => 'sustained_20', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e_c_s30', 'source' => 'compare_85', 'target' => 'sustained_30', 'sourceHandle' => 'output', 'targetHandle' => 'input'],

                ['id' => 'e_s10', 'source' => 'sustained_10', 'target' => 'email_10',   'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e_s20', 'source' => 'sustained_20', 'target' => 'email_20',   'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e_s30', 'source' => 'sustained_30', 'target' => 'discord_30', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ],
        ]);

        $result = $this->engine->trigger($config, 'metric_disk', 99.03, [
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'disk_usage',
        ], 1);

        // Condition (>=85) should pass
        $compareState = NodeConfigState::where('node_config_id', $config->id)
            ->where('node_id', 'compare_85')
            ->where('server_id', 1)
            ->first();
        $this->assertNotNull($compareState, 'compare_85 state should be saved');
        $this->assertEquals(['value' => true], $compareState->output_value, 'Condition should evaluate to true for disk 99.03 >= 85');

        // No actions yet — sustained needs Agent/DB records to propagate
        $this->assertEmpty($result['actions'], 'No notification should fire yet');
    }

    public function test_disk_metric_below_threshold_does_not_schedule(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'metric_disk',  'type' => 'metric',     'settings' => ['metric_type' => 'disk_usage']],
                ['id' => 'compare_85',   'type' => 'condition',  'settings' => ['operator' => 'greater_than_equal', 'threshold' => 85]],
                ['id' => 'sustained_10', 'type' => 'sustained',  'settings' => ['duration' => '10000']],
                ['id' => 'email_10',     'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => 'Alert']],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'metric_disk',  'target' => 'compare_85',   'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e2', 'source' => 'compare_85',   'target' => 'sustained_10', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e3', 'source' => 'sustained_10', 'target' => 'email_10',     'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ],
        ]);

        $result = $this->engine->trigger($config, 'metric_disk', 52.1, [
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'disk_usage',
        ], 1);

        $compareState = NodeConfigState::where('node_config_id', $config->id)
            ->where('node_id', 'compare_85')
            ->where('server_id', 1)
            ->first();
        $this->assertNotNull($compareState);
        $this->assertEquals(['value' => false], $compareState->output_value, 'Condition should evaluate to false');

        $this->assertEmpty($result['timers'], 'No sustained timer when below threshold');
        $this->assertEmpty($result['actions'], 'No notification when below threshold');
    }

    public function test_only_disk_metric_triggers_not_others(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'metric_cpu',     'type' => 'metric',     'settings' => ['metric_type' => 'cpu_usage']],
                ['id' => 'metric_memory',  'type' => 'metric',     'settings' => ['metric_type' => 'memory_usage']],
                ['id' => 'metric_disk',    'type' => 'metric',     'settings' => ['metric_type' => 'disk_usage']],
                ['id' => 'metric_network', 'type' => 'metric',     'settings' => ['metric_type' => 'network_usage']],

                ['id' => 'compare_85',     'type' => 'condition',  'settings' => ['operator' => 'greater_than_equal', 'threshold' => 85]],

                ['id' => 'sustained_10',   'type' => 'sustained',  'settings' => ['duration' => '10000']],
                ['id' => 'email_10',       'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => 'Alert']],
            ],
            'edges' => [
                ['id' => 'e_cpu',  'source' => 'metric_cpu',     'target' => 'compare_85',   'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e_mem',  'source' => 'metric_memory',  'target' => 'compare_85',   'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e_disk', 'source' => 'metric_disk',    'target' => 'compare_85',   'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e_net',  'source' => 'metric_network', 'target' => 'compare_85',   'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e_c_s',  'source' => 'compare_85',     'target' => 'sustained_10', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
                ['id' => 'e_s_e',  'source' => 'sustained_10',   'target' => 'email_10',     'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ],
        ]);

        // Trigger ONLY disk_usage at 99.03%
        $result = $this->engine->trigger($config, 'metric_disk', 99.03, [
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'disk_usage',
        ], 1);

        $this->assertTrue($result['success']);

        // Verify compare_85 was saved with true
        $compareState = NodeConfigState::where('node_config_id', $config->id)
            ->where('node_id', 'compare_85')
            ->where('server_id', 1)
            ->first();
        $this->assertEquals(['value' => true], $compareState->output_value, 'Disk at 99.03 >= 85 should be true');

        // Now trigger cpu_usage at 70% — should flip condition to false
        $resultCpu = $this->engine->trigger($config, 'metric_cpu', 70.0, [
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'cpu_usage',
        ], 1);

        $compareStateAfter = NodeConfigState::where('node_config_id', $config->id)
            ->where('node_id', 'compare_85')
            ->where('server_id', 1)
            ->first();
        $this->assertEquals(['value' => false], $compareStateAfter->output_value, 'CPU at 70 < 85 should be false');
    }

    public function test_template_input_node_overrides_condition_threshold(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'metric_cpu', 'type' => 'metric', 'settings' => ['metric_type' => 'cpu_usage']],
                ['id' => 'threshold', 'type' => 'template', 'settings' => ['template_id' => 'cpu_warn_threshold', 'data_type' => 'number']],
                ['id' => 'compare', 'type' => 'condition', 'settings' => ['operator' => 'greater_than', 'threshold' => 0]],
                ['id' => 'notify', 'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => 'Alert', 'message' => 'CPU high']],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'metric_cpu', 'target' => 'compare', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
                ['id' => 'e2', 'source' => 'threshold', 'target' => 'compare', 'sourceHandle' => 'output', 'targetHandle' => 'input-b'],
                ['id' => 'e3', 'source' => 'compare', 'target' => 'notify', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ],
        ]);

        // value below injected threshold (80) → compare false, no action
        $below = $this->engine->trigger($config, 'metric_cpu', 50.0, [
            'server_name' => 'TestServer', 'client_name' => 'TestClient',
            'metric_type' => 'cpu_usage', 'cpu_warn_threshold' => 80,
        ]);
        $this->assertTrue($below['success']);
        $this->assertEmpty($below['actions'], '50 < 80 should not fire');

        NodeConfigState::where('node_config_id', $config->id)->delete();

        // value above injected threshold (80) → compare true, action fires
        $above = $this->engine->trigger($config, 'metric_cpu', 92.5, [
            'server_name' => 'TestServer', 'client_name' => 'TestClient',
            'metric_type' => 'cpu_usage', 'cpu_warn_threshold' => 80,
        ]);
        $this->assertTrue($above['success']);
        $this->assertNotEmpty($above['actions'], '92.5 > 80 should fire notification');
        $this->assertEquals('notify', $above['actions'][0]['node_id']);

        $compareState = NodeConfigState::where('node_config_id', $config->id)
            ->where('node_id', 'compare')
            ->first();
        $this->assertEquals(['value' => true], $compareState->output_value);
    }

    public function test_template_input_resolves_builtin_leaf_id(): void
    {
        $config = $this->createConfig([
            'nodes' => [
                ['id' => 'metric_ports', 'type' => 'metric', 'settings' => ['metric_type' => 'ports_ping']],
                ['id' => 'ping_value', 'type' => 'template', 'settings' => ['template_id' => 'ping', 'data_type' => 'number']],
                ['id' => 'compare', 'type' => 'condition', 'settings' => ['operator' => 'greater_than', 'threshold' => 0]],
                ['id' => 'notify', 'type' => 'notification', 'settings' => ['channel' => 'email', 'subject' => 'Slow', 'message' => 'Slow']],
            ],
            'edges' => [
                ['id' => 'e1', 'source' => 'metric_ports', 'target' => 'compare', 'sourceHandle' => 'timing', 'targetHandle' => 'input-a'],
                ['id' => 'e2', 'source' => 'ping_value', 'target' => 'compare', 'sourceHandle' => 'output', 'targetHandle' => 'input-b'],
                ['id' => 'e3', 'source' => 'compare', 'target' => 'notify', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ],
        ]);

        // ping 500ms vs threshold of 150 from built-in leaf id 'ping'
        $result = $this->engine->trigger($config, 'metric_ports', 500, [
            'server_name' => 'TestServer',
            'client_name' => 'TestClient',
            'metric_type' => 'ports_ping',
            'ping' => 150,
        ]);

        $this->assertTrue($result['success']);
        $this->assertNotEmpty($result['actions'], '500 > 150 should fire notification');

        $compareState = NodeConfigState::where('node_config_id', $config->id)
            ->where('node_id', 'compare')
            ->first();
        $this->assertNotNull($compareState);
        $this->assertEquals(['value' => true], $compareState->output_value, '500 > 150 from built-in leaf id ping');
    }
}
