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
            $sourceHandle = $edge['sourceHandle'] ?? 'output';
            if (!isset($edgeList[$target])) {
                $edgeList[$target] = [];
            }
            $edgeList[$target][] = ['source' => $source, 'sourceHandle' => $sourceHandle];
        }

        $conditionContexts = $this->buildConditionContexts($edges, $nodeMap);
        $repeatContexts = $this->buildRepeatContexts($edges, $nodeMap);

        $outputs = [];
        $timers = [];
        $actions = [];

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

            $inputValues = [];
            $upstreamEdges = $edgeList[$nodeId] ?? [];
            foreach ($upstreamEdges as $edgeInfo) {
                $upstreamId = $edgeInfo['source'];
                $sourceHandle = $edgeInfo['sourceHandle'];
                if (isset($outputs[$upstreamId][$sourceHandle])) {
                    $inputValues[] = $outputs[$upstreamId][$sourceHandle];
                } elseif (isset($outputs[$upstreamId])) {
                    $inputValues[] = $outputs[$upstreamId];
                } else {
                    $inputValues[] = null;
                }
            }

            $currentState = [];
            if (isset($persistedStates[$nodeId])) {
                $currentState = $persistedStates[$nodeId]->context ?? [];
            }

            if ($nodeId === $sourceNodeId) {
                $currentState['metric_value'] = $value;
            }
            $currentState = array_merge($currentState, $extraState);

            if ($node['type'] === 'sustained' && isset($conditionContexts[$nodeId])) {
                $currentState = array_merge($currentState, $conditionContexts[$nodeId]);
            }

            if ($node['type'] === 'repeat' && isset($repeatContexts[$nodeId])) {
                $currentState = array_merge($currentState, $repeatContexts[$nodeId]);
            }

            $result = $handler->evaluate($inputValues, $node['settings'] ?? [], $currentState);

            if (!empty($result->outputs)) {
                $outputs[$nodeId] = $result->outputs;
            } elseif ($result->shouldPropagate) {
                $outputs[$nodeId] = ['output' => $result->value];
            }

            NodeConfigState::updateOrCreate(
                ['node_config_id' => $config->id, 'node_id' => $nodeId],
                ['output_value' => $result->shouldPropagate ? ['value' => $result->value] : null, 'context' => $result->state],
            );

            if ($result->timer !== null) {
                $timers[] = [
                    'node_config_id' => $config->id,
                    'node_id' => $nodeId,
                    'delay_ms' => $result->timer->delayMs,
                    'context' => $result->timer->context,
                ];
            }

            if ($handler->getCategory() === 'action' && $result->shouldPropagate && $result->value) {
                $upstreamContext = $this->resolveUpstreamContext($nodeId, $edgeList, $nodeMap, $outputs);
                $upstreamContext = array_merge($upstreamContext, $extraState);
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

        $persisted = NodeConfigState::where('node_config_id', $config->id)
            ->where('node_id', $nodeId)
            ->first();

        $state = $persisted?->context ?? [];
        $state['timer_fire'] = true;

        $result = $handler->evaluate([], $nodeMap[$nodeId]['settings'] ?? [], $state);

        $outputVal = !empty($result->outputs) ? $result->value : ($result->shouldPropagate ? $result->value : null);
        NodeConfigState::updateOrCreate(
            ['node_config_id' => $config->id, 'node_id' => $nodeId],
            ['output_value' => $outputVal !== null ? ['value' => $outputVal] : null, 'context' => $result->state],
        );

        if (!$result->shouldPropagate && empty($result->outputs)) {
            return ['success' => true, 'propagated' => false];
        }

        $hasSustainedAncestor = $state['has_sustained_ancestor'] ?? false;
        $accumulatedExtra = (int) ($result->state['accumulated_extra_seconds'] ?? 0);

        if ($hasSustainedAncestor && $result->shouldPropagate && $accumulatedExtra > 0) {
            return $this->retriggerFromSource($config, $nodeMap, $edges, $accumulatedExtra, $context);
        }

        return $this->processDownstream($config, $nodeId, $result, $nodeMap, $edges, $context);
    }

    /**
     * Re-trigger evaluation from the metric source with accumulated sustain time.
     */
    private function retriggerFromSource(
        NodeConfig $config,
        array $nodeMap,
        array $edges,
        int $accumulatedExtraSeconds,
        array $context,
    ): array {
        $sourceNodeId = null;
        foreach ($nodeMap as $node) {
            if (($node['type'] ?? '') === 'metric') {
                $sourceNodeId = $node['id'];
                break;
            }
        }

        if (!$sourceNodeId) {
            return ['success' => true, 'propagated' => false];
        }

        $metricValue = $context['metric_value'] ?? null;
        if ($metricValue === null) {
            $persisted = NodeConfigState::where('node_config_id', $config->id)
                ->where('node_id', $sourceNodeId)
                ->first();
            $metricValue = $persisted?->output_value['value'] ?? null;
        }

        if ($metricValue === null) {
            return ['success' => true, 'propagated' => false];
        }

        $extraState = array_merge($context, [
            'extra_sustain_seconds' => $accumulatedExtraSeconds,
        ]);

        return $this->trigger($config, $sourceNodeId, $metricValue, $extraState);
    }

    /**
     * Process downstream nodes from a timer node.
     */
    private function processDownstream(
        NodeConfig $config,
        string $nodeId,
        NodeResult $result,
        array $nodeMap,
        array $edges,
        array $context,
    ): array {
        $downstreamIds = [];
        foreach ($edges as $edge) {
            if ($edge['source'] === $nodeId) {
                $downstreamIds[] = $edge['target'];
            }
        }

        $order = $this->validator->topologicalSort($nodeMap ? array_values($nodeMap) : [], $edges);
        $startIndex = array_search($nodeId, $order);
        if ($startIndex === false) {
            return ['success' => true, 'propagated' => false];
        }

        $downstreamOrder = array_slice($order, $startIndex + 1);
        $outputs = [$nodeId => ['output' => $result->value]];
        $edgeList = [];
        foreach ($edges as $edge) {
            $source = $edge['source'];
            $target = $edge['target'];
            $sourceHandle = $edge['sourceHandle'] ?? 'output';
            if (!isset($edgeList[$target])) {
                $edgeList[$target] = [];
            }
            $edgeList[$target][] = ['source' => $source, 'sourceHandle' => $sourceHandle];
        }

        $allPersisted = NodeConfigState::where('node_config_id', $config->id)
            ->get()
            ->keyBy('node_id');

        $conditionContexts = $this->buildConditionContexts($edges, $nodeMap);

        $downstreamTimers = [];
        $downstreamActions = [];

        foreach ($downstreamOrder as $currentId) {
            $currentNode = $nodeMap[$currentId] ?? null;
            if (!$currentNode) continue;

            $currentHandler = $this->registry->get($currentNode['type']);
            if (!$currentHandler) continue;

            $inputValues = [];
            $upstreamEdges = $edgeList[$currentId] ?? [];
            foreach ($upstreamEdges as $edgeInfo) {
                $upstreamId = $edgeInfo['source'];
                $sourceHandle = $edgeInfo['sourceHandle'];
                if (isset($outputs[$upstreamId][$sourceHandle])) {
                    $inputValues[] = $outputs[$upstreamId][$sourceHandle];
                } elseif (isset($outputs[$upstreamId])) {
                    $inputValues[] = $outputs[$upstreamId];
                } else {
                    $inputValues[] = null;
                }
            }

            $currentState = [];
            if (isset($allPersisted[$currentId])) {
                $currentState = $allPersisted[$currentId]->context ?? [];
            }

            $currentState = array_merge($currentState, $context);

            if ($currentNode['type'] === 'sustained' && isset($conditionContexts[$currentId])) {
                $currentState = array_merge($currentState, $conditionContexts[$currentId]);
            }

            $currentResult = $currentHandler->evaluate($inputValues, $currentNode['settings'] ?? [], $currentState);

            if (!empty($currentResult->outputs)) {
                $outputs[$currentId] = $currentResult->outputs;
            } elseif ($currentResult->shouldPropagate) {
                $outputs[$currentId] = ['output' => $currentResult->value];
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
                $upstreamContext = array_merge($upstreamContext, $context);
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
            'outputs' => [],
            'timers' => $downstreamTimers,
            'actions' => $downstreamActions,
        ];
    }

    /**
     * Build a map of node_id => condition settings for each ConditionNode,
     * keyed by the SustainedNode it feeds into.
     */
    private function buildConditionContexts(array $edges, array $nodeMap): array
    {
        $contexts = [];

        foreach ($edges as $edge) {
            $sourceNode = $nodeMap[$edge['source']] ?? null;
            $targetNode = $nodeMap[$edge['target']] ?? null;

            if (!$sourceNode || !$targetNode) continue;
            if (($sourceNode['type'] ?? '') !== 'condition') continue;
            if (($targetNode['type'] ?? '') !== 'sustained') continue;

            $contexts[$edge['target']] = [
                'threshold' => $sourceNode['settings']['threshold'] ?? null,
                'operator' => $sourceNode['settings']['operator'] ?? 'greater_than',
            ];
        }

        return $contexts;
    }

    /**
     * Build a map of repeat node_id => sustained ancestor info.
     * Walks backward from each repeat node to find if it has a Sustained ancestor.
     */
    private function buildRepeatContexts(array $edges, array $nodeMap): array
    {
        $contexts = [];
        $repeatNodes = [];

        foreach ($nodeMap as $node) {
            if (($node['type'] ?? '') === 'repeat') {
                $repeatNodes[] = $node['id'];
            }
        }

        foreach ($repeatNodes as $repeatId) {
            $sustainedInfo = $this->findSustainedAncestor($repeatId, $edges, $nodeMap);
            if ($sustainedInfo) {
                $contexts[$repeatId] = $sustainedInfo;
            }
        }

        return $contexts;
    }

    /**
     * Walk backward from a node to find the first Sustained ancestor and its duration.
     */
    private function findSustainedAncestor(string $nodeId, array $edges, array $nodeMap): ?array
    {
        $visited = [];
        $queue = [$nodeId];

        while (!empty($queue)) {
            $currentId = array_shift($queue);
            if (isset($visited[$currentId])) continue;
            $visited[$currentId] = true;

            foreach ($edges as $edge) {
                if ($edge['target'] === $currentId) {
                    $sourceNode = $nodeMap[$edge['source']] ?? null;
                    if (!$sourceNode) continue;

                    if (($sourceNode['type'] ?? '') === 'sustained') {
                        $durationStr = $sourceNode['settings']['duration'] ?? '00:00:05:00:00';
                        return [
                            'has_sustained_ancestor' => true,
                            'sustain_duration_seconds' => static::parseDurationToSeconds($durationStr),
                        ];
                    }

                    $queue[] = $edge['source'];
                }
            }
        }

        return null;
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

            $upstreamEdges = $edgeList[$currentId] ?? [];
            foreach ($upstreamEdges as $edgeInfo) {
                $upstreamId = $edgeInfo['source'];
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
