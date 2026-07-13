<?php

namespace App\NodeConfig\Engine;

use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\Models\NodeConfigState;
use App\NodeConfig\NodeTypes\NodeResult;
use App\NodeConfig\NodeTypes\NodeTimer;
use App\NodeConfig\Validation\NodeConfigValidator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NodeConfigEngine
{
    private NodeRegistry $registry;
    private NodeConfigValidator $validator;

    private const METRIC_NAMES = [
        'cpu_usage' => 'CPU Usage',
        'memory_usage' => 'Memory Usage',
        'disk_usage' => 'Disk Usage',
        'network_usage' => 'Network Usage',
        'server_status' => 'Server Status',
        'heartbeat_age' => 'Heartbeat Age',
    ];

    public function __construct(NodeRegistry $registry)
    {
        $this->registry = $registry;
        $this->validator = new NodeConfigValidator();
    }

    public function getValidator(): NodeConfigValidator
    {
        return $this->validator;
    }

    /**
     * Trigger evaluation from a source node with a metric value.
     */
    public function trigger(NodeConfig $config, string $sourceNodeId, mixed $value, array $extraState = []): array
    {
        $configData = $config->getParsedConfig();
        $nodes = $configData['nodes'] ?? [];
        $edges = $configData['edges'] ?? [];

        if (!$this->validator->validate($configData)) {
            Log::warning('NodeConfigEngine: invalid config for node config ' . $config->id, [
                'errors' => $this->validator->getErrors(),
            ]);
            return ['success' => false, 'errors' => $this->validator->getErrors()];
        }

        $order = $this->validator->topologicalSort($nodes, $edges);
        $nodeMap = [];
        foreach ($nodes as $node) {
            $nodeMap[$node['id']] = $node;
        }

        $edgeList = [];
        foreach ($edges as $edge) {
            $source = $edge['source'];
            $target = $edge['target'];
            if (!isset($edgeList[$target])) {
                $edgeList[$target] = [];
            }
            $edgeList[$target][] = $source;
        }

        $outputs = [];
        $timers = [];
        $actions = [];

        // Load persisted state
        $persistedStates = NodeConfigState::where('node_config_id', $config->id)
            ->get()
            ->keyBy('node_id');

        foreach ($order as $nodeId) {
            $node = $nodeMap[$nodeId] ?? null;
            if (!$node) continue;

            $handler = $this->registry->get($node['type']);
            if (!$handler) {
                Log::warning("NodeConfigEngine: unknown node type {$node['type']} for node $nodeId");
                continue;
            }

            // Gather input values from upstream outputs
            $inputValues = [];
            $upstreamNodes = $edgeList[$nodeId] ?? [];
            foreach ($upstreamNodes as $upstreamId) {
                if (isset($outputs[$upstreamId])) {
                    $inputValues[] = $outputs[$upstreamId];
                } else {
                    $inputValues[] = null;
                }
            }

            // Build state from persisted + current
            $currentState = [];
            if (isset($persistedStates[$nodeId])) {
                $currentState = $persistedStates[$nodeId]->context ?? [];
            }

            // Inject trigger data for source nodes
            if ($nodeId === $sourceNodeId) {
                $currentState['metric_value'] = $value;
            }
            $currentState = array_merge($currentState, $extraState);

            // Evaluate
            $result = $handler->evaluate($inputValues, $node['settings'] ?? [], $currentState);

            // Store output
            if ($result->shouldPropagate) {
                $outputs[$nodeId] = $result->value;
            }

            // Persist state
            NodeConfigState::updateOrCreate(
                ['node_config_id' => $config->id, 'node_id' => $nodeId],
                ['output_value' => $result->shouldPropagate ? ['value' => $result->value] : null, 'context' => $result->state],
            );

            // Collect timers
            if ($result->timer !== null) {
                $timers[] = [
                    'node_config_id' => $config->id,
                    'node_id' => $nodeId,
                    'delay_ms' => $result->timer->delayMs,
                    'context' => $result->timer->context,
                ];
            }

            // Collect actions
            if ($handler->getCategory() === 'action' && $result->shouldPropagate && $result->value) {
                $upstreamContext = $this->resolveUpstreamContext($nodeId, $edgeList, $nodeMap, $outputs);
                $actions[] = [
                    'node_id' => $nodeId,
                    'type' => $handler->getType(),
                    'settings' => $node['settings'] ?? [],
                    'value' => $result->value,
                    'upstream_context' => $upstreamContext,
                ];
            }
        }

        return [
            'success' => true,
            'outputs' => $outputs,
            'timers' => $timers,
            'actions' => $actions,
        ];
    }

    /**
     * Fire a timer for a specific node (e.g., Delay or Repeat).
     */
    public function fireTimer(NodeConfig $config, string $nodeId, array $context = []): array
    {
        $configData = $config->getParsedConfig();
        $nodes = $configData['nodes'] ?? [];
        $edges = $configData['edges'] ?? [];
        $nodeMap = [];
        foreach ($nodes as $n) {
            $nodeMap[$n['id']] = $n;
        }

        $handler = $this->registry->get($nodeMap[$nodeId]['type'] ?? '');
        if (!$handler) {
            return ['success' => false, 'error' => "Unknown node type for $nodeId"];
        }

        // Load persisted state
        $persisted = NodeConfigState::where('node_config_id', $config->id)
            ->where('node_id', $nodeId)
            ->first();

        $state = $persisted?->context ?? [];
        $state['timer_fire'] = true;

        $result = $handler->evaluate([], $nodeMap[$nodeId]['settings'] ?? [], $state);

        // Persist new state
        NodeConfigState::updateOrCreate(
            ['node_config_id' => $config->id, 'node_id' => $nodeId],
            ['output_value' => $result->shouldPropagate ? ['value' => $result->value] : null, 'context' => $result->state],
        );

        if (!$result->shouldPropagate) {
            return ['success' => true, 'propagated' => false];
        }

        // Propagate to downstream nodes
        $downstreamIds = [];
        foreach ($edges as $edge) {
            if ($edge['source'] === $nodeId) {
                $downstreamIds[] = $edge['target'];
            }
        }

        // Re-trigger from this node downstream
        $downstreamOutputs = [];
        $downstreamTimers = [];
        $downstreamActions = [];
        $order = $this->validator->topologicalSort($nodes, $edges);

        // Find position of this node in order
        $startIndex = array_search($nodeId, $order);
        if ($startIndex === false) {
            return ['success' => true, 'propagated' => false];
        }

        $downstreamOrder = array_slice($order, $startIndex + 1);
        $outputs = [$nodeId => $result->value];
        $edgeList = [];
        foreach ($edges as $edge) {
            $source = $edge['source'];
            $target = $edge['target'];
            if (!isset($edgeList[$target])) {
                $edgeList[$target] = [];
            }
            $edgeList[$target][] = $source;
        }

        // Load all persisted states for downstream
        $allPersisted = NodeConfigState::where('node_config_id', $config->id)
            ->get()
            ->keyBy('node_id');

        foreach ($downstreamOrder as $currentId) {
            $currentNode = $nodeMap[$currentId] ?? null;
            if (!$currentNode) continue;

            $currentHandler = $this->registry->get($currentNode['type']);
            if (!$currentHandler) continue;

            $inputValues = [];
            $upstreamNodes = $edgeList[$currentId] ?? [];
            foreach ($upstreamNodes as $upstreamId) {
                $inputValues[] = $outputs[$upstreamId] ?? null;
            }

            $currentState = [];
            if (isset($allPersisted[$currentId])) {
                $currentState = $allPersisted[$currentId]->context ?? [];
            }

            $currentResult = $currentHandler->evaluate($inputValues, $currentNode['settings'] ?? [], $currentState);

            if ($currentResult->shouldPropagate) {
                $outputs[$currentId] = $currentResult->value;
            }

            NodeConfigState::updateOrCreate(
                ['node_config_id' => $config->id, 'node_id' => $currentId],
                ['output_value' => $currentResult->shouldPropagate ? ['value' => $currentResult->value] : null, 'context' => $currentResult->state],
            );

            if ($currentResult->timer !== null) {
                $downstreamTimers[] = [
                    'node_config_id' => $config->id,
                    'node_id' => $currentId,
                    'delay_ms' => $currentResult->timer->delayMs,
                    'context' => $currentResult->timer->context,
                ];
            }

            if ($currentHandler->getCategory() === 'action' && $currentResult->shouldPropagate && $currentResult->value) {
                $upstreamContext = $this->resolveUpstreamContext($currentId, $edgeList, $nodeMap, $outputs);
                $downstreamActions[] = [
                    'node_id' => $currentId,
                    'type' => $currentHandler->getType(),
                    'settings' => $currentNode['settings'] ?? [],
                    'value' => $currentResult->value,
                    'upstream_context' => $upstreamContext,
                ];
            }
        }

        return [
            'success' => true,
            'propagated' => true,
            'outputs' => $downstreamOutputs,
            'timers' => $downstreamTimers,
            'actions' => $downstreamActions,
        ];
    }

    /**
     * Walk backward from an action node to collect metric names and sustain durations.
     */
    private function resolveUpstreamContext(string $actionNodeId, array $edgeList, array $nodeMap, array $outputs): array
    {
        $metricNames = [];
        $sustainDurations = [];
        $visited = [];
        $queue = [$actionNodeId];

        while (!empty($queue)) {
            $currentId = array_shift($queue);
            if (isset($visited[$currentId])) continue;
            $visited[$currentId] = true;

            $upstreamIds = $edgeList[$currentId] ?? [];
            foreach ($upstreamIds as $upstreamId) {
                $node = $nodeMap[$upstreamId] ?? null;
                if (!$node) continue;

                $type = $node['type'] ?? '';
                $settings = $node['settings'] ?? [];

                if (in_array($type, ['metric', 'cpu_usage', 'memory_usage', 'disk_usage', 'network_usage', 'server_status', 'heartbeat_age'])) {
                    $metricType = $settings['metric_type'] ?? $type;
                    $name = self::METRIC_NAMES[$metricType] ?? $metricType;
                    if (!in_array($name, $metricNames)) {
                        $metricNames[] = $name;
                    }
                }

                if ($type === 'sustained') {
                    $durationStr = $settings['duration'] ?? '00:00:05:00:00';
                    $seconds = static::parseDurationToSeconds($durationStr);
                    $formatted = $this->formatDuration($seconds);
                    if (!in_array($formatted, $sustainDurations)) {
                        $sustainDurations[] = $formatted;
                    }
                }

                $queue[] = $upstreamId;
            }
        }

        return [
            'metric_name' => implode(', ', $metricNames) ?: 'Unknown Metric',
            'sustain_value' => implode(', ', $sustainDurations) ?: null,
        ];
    }

    private function formatDuration(int $seconds): string
    {
        if ($seconds < 60) return $seconds . ' second' . ($seconds !== 1 ? 's' : '');
        if ($seconds < 3600) {
            $m = intdiv($seconds, 60);
            return $m . ' minute' . ($m !== 1 ? 's' : '');
        }
        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);
        if ($m > 0) return $h . ' hour' . ($h !== 1 ? 's' : '') . ' ' . $m . ' minute' . ($m !== 1 ? 's' : '');
        return $h . ' hour' . ($h !== 1 ? 's' : '');
    }
}
