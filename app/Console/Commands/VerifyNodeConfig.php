<?php

namespace App\Console\Commands;

use App\NodeConfig\Cache\NodeConfigCache;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Models\NodeConfig;
use Illuminate\Console\Command;

class VerifyNodeConfig extends Command
{
    protected $signature = 'node-config:verify {--slug=alerts : The slug of the config to verify}';
    protected $description = 'Verify a node config by evaluating each metric path with sample values';

    public function handle(NodeRegistry $registry): int
    {
        $slug = $this->option('slug');

        $this->newLine();
        $this->info("Verifying node config: {$slug}");
        $this->line(str_repeat('─', 60));

        $config = NodeConfigCache::findBySlug($slug);
        if (!$config) {
            $this->error("Config with slug '{$slug}' not found in cache or database.");
            return self::FAILURE;
        }

        $this->info("Config loaded: {$config->name} (ID: {$config->id})");
        $this->newLine();

        $configData = $config->getParsedConfig();
        $nodes = $configData['nodes'] ?? [];
        $edges = $configData['edges'] ?? [];

        $this->info("Nodes: " . count($nodes) . ", Edges: " . count($edges));
        $this->newLine();

        $validator = new \App\NodeConfig\Validation\NodeConfigValidator();
        if (!$validator->validate($configData)) {
            $this->error("Config validation failed:");
            foreach ($validator->getErrors() as $error) {
                $this->error("  - {$error}");
            }
            return self::FAILURE;
        }
        $this->info("Validation: OK");
        $this->newLine();

        $engine = new NodeConfigEngine($registry);

        $testCases = $this->buildTestCases($nodes);

        $passed = 0;
        $failed = 0;

        foreach ($testCases as $testCase) {
            $sourceNodeId = $testCase['source_node_id'];
            $value = $testCase['value'];
            $label = $testCase['label'];
            $expectedActions = $testCase['expected_actions'] ?? [];

            $result = $engine->trigger(
                $config,
                $sourceNodeId,
                $value,
                $testCase['extra_state'] ?? ['server_id' => 1, 'server_name' => 'TestServer', 'client_name' => 'TestClient']
            );

            if (!$result['success']) {
                $this->error("FAIL [{$label}] - Engine errors: " . implode(', ', $result['errors'] ?? ['unknown']));
                $failed++;
                continue;
            }

            $actionTypes = array_map(fn($a) => $a['type'] ?? 'unknown', $result['actions']);
            $timerCount = count($result['timers']);

            $hasExpected = empty($expectedActions) || !empty(array_intersect($expectedActions, $actionTypes));

            if ($hasExpected) {
                $timerInfo = $timerCount > 0 ? " ({$timerCount} timer(s) scheduled)" : "";
                $actionInfo = !empty($result['actions']) ? " -> actions: [" . implode(', ', $actionTypes) . "]" : " -> no actions";
                $this->info("PASS [{$label}]{$timerInfo}{$actionInfo}");
                $passed++;
            } else {
                $this->warn("WARN [{$label}] - Expected actions [{$expectedActions[0]}] but got: [" . implode(', ', $actionTypes) . "]");
                $failed++;
            }

            foreach ($result['timers'] as $timer) {
                $timerResult = $engine->fireTimer($config, $timer['node_id'], array_merge($timer['context'], $testCase['extra_state'] ?? []));
                if ($timerResult['success'] && ($timerResult['propagated'] ?? false)) {
                    $timerActions = array_map(fn($a) => $a['type'] ?? 'unknown', $timerResult['actions'] ?? []);
                    if (!empty($timerActions)) {
                        $this->info("  TIMER [{$timer['node_id']}] fired -> actions: [" . implode(', ', $timerActions) . "]");
                    } else {
                        $this->line("  TIMER [{$timer['node_id']}] fired -> no actions (propagated downstream)");
                    }
                } else {
                    $this->line("  TIMER [{$timer['node_id']}] fired -> no propagation");
                }
            }
        }

        $this->newLine();
        $this->line(str_repeat('─', 60));
        $this->info("Results: {$passed} passed, {$failed} failed, " . ($passed + $failed) . " total");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function buildTestCases(array $nodes): array
    {
        $cases = [];

        $metricNodes = array_filter($nodes, fn($n) => ($n['type'] ?? '') === 'metric');

        foreach ($metricNodes as $node) {
            $metricType = $node['settings']['metric_type'] ?? 'cpu_usage';
            $nodeId = $node['id'];

            if ($metricType === 'server_status') {
                $cases[] = [
                    'source_node_id' => $nodeId,
                    'value' => 'offline',
                    'label' => "{$metricType} (offline)",
                    'expected_actions' => ['notification'],
                    'extra_state' => [
                        'server_id' => 1,
                        'server_name' => 'TestServer',
                        'client_name' => 'TestClient',
                        'metric_type' => $metricType,
                    ],
                ];
                $cases[] = [
                    'source_node_id' => $nodeId,
                    'value' => 'online',
                    'label' => "{$metricType} (online)",
                    'expected_actions' => [],
                    'extra_state' => [
                        'server_id' => 1,
                        'server_name' => 'TestServer',
                        'client_name' => 'TestClient',
                        'metric_type' => $metricType,
                    ],
                ];
            } else {
                $cases[] = [
                    'source_node_id' => $nodeId,
                    'value' => 92.5,
                    'label' => "{$metricType} (high value: 92.5)",
                    'expected_actions' => ['notification'],
                    'extra_state' => [
                        'server_id' => 1,
                        'server_name' => 'TestServer',
                        'client_name' => 'TestClient',
                        'metric_type' => $metricType,
                    ],
                ];
                $cases[] = [
                    'source_node_id' => $nodeId,
                    'value' => 45.0,
                    'label' => "{$metricType} (normal value: 45.0)",
                    'expected_actions' => [],
                    'extra_state' => [
                        'server_id' => 1,
                        'server_name' => 'TestServer',
                        'client_name' => 'TestClient',
                        'metric_type' => $metricType,
                    ],
                ];
            }
        }

        return $cases;
    }
}
