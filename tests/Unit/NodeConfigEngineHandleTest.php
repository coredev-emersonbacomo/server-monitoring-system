<?php

namespace Tests\Unit;

use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\NodeTypes\CheckAfterNode;
use App\NodeConfig\NodeTypes\ConditionNode;
use App\NodeConfig\NodeTypes\LogicNode;
use App\NodeConfig\NodeTypes\MetricNode;
use App\NodeConfig\NodeTypes\NotificationNode;
use App\NodeConfig\NodeTypes\RepeatNode;
use App\NodeConfig\NodeTypes\SustainedNode;
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

        $this->engine = new NodeConfigEngine($registry);
    }

    private function createConfig(array $configData): NodeConfig
    {
        return NodeConfig::create([
            'name' => 'Test Config',
            'config' => $configData,
            'enabled' => true,
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
                ['id' => 'repeat', 'type' => 'repeat', 'settings' => ['interval' => '00:00:00:05:00']],
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
                ['id' => 'repeat', 'type' => 'repeat', 'settings' => ['interval' => '00:00:00:05:00']],
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
                ['id' => 'check', 'type' => 'check_after', 'settings' => ['duration' => '00:00:00:10:00']],
                ['id' => 'notify', 'type' => 'notification', 'settings' => ['channel' => 'discord', 'message' => 'Still offline']],
                ['id' => 'repeat', 'type' => 'repeat', 'settings' => ['interval' => '00:00:00:05:00']],
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
}
