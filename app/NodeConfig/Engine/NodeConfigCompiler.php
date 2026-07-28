<?php

namespace App\NodeConfig\Engine;

use App\NodeConfig\NodeTypes\BaseNode;

class NodeConfigCompiler
{
    /**
     * Compile a node config graph into a branched, per-metric ruleset.
     *
     * Output structure:
     *  branches[] → one per metric node
     *    metric, metric_node_id, metric_source_handle
     *    condition, condition_node_id  (shared across sub-branches)
     *    sub_branches[] → one per downstream action path
     *      timing, timing_node_id
     *      action, action_node_id
     *      post_action  (repeat/check_after after notification)
     */
    public function compile(array $config): array
    {
        $nodes = $config['nodes'] ?? [];
        $edges = $config['edges'] ?? [];

        if (empty($nodes)) {
            return ['branches' => []];
        }

        $nodeMap = [];
        foreach ($nodes as $node) {
            $nodeMap[$node['id']] = $node;
        }

        $reverseAdj = [];
        $forwardAdj = [];
        foreach ($edges as $edge) {
            $reverseAdj[$edge['target']][] = $edge['source'];
            $forwardAdj[$edge['source']][] = [
                'target' => $edge['target'],
                'sourceHandle' => $edge['sourceHandle'] ?? 'output',
            ];
        }

        $actionNodes = array_filter($nodes, fn($n) => ($n['type'] ?? '') === 'notification');

        $flatRules = [];
        foreach ($actionNodes as $actionNode) {
            $pathRules = $this->traceBackwardPerAction($actionNode, $nodeMap, $reverseAdj, $forwardAdj);
            $flatRules = array_merge($flatRules, $pathRules);
        }

        $branches = $this->groupByMetric($flatRules);

        return ['branches' => $branches];
    }

    /**
     * Trace backward from an action node, collecting metric/condition/timing along the path.
     */
    private function traceBackwardPerAction(
        array $startNode,
        array $nodeMap,
        array $reverseAdj,
        array $forwardAdj,
    ): array {
        $metrics = [];
        $conditions = [];
        $conditionNodeIds = [];
        $timingNodes = [];
        $timingNodeIds = [];
        $actionSettings = $startNode['settings'] ?? [];

        // queue entries are [nodeId, downstreamChildId] — child is the node we came from
        $queue = [[$startNode['id'], null]];
        $visited = [$startNode['id'] => true];

        while (!empty($queue)) {
            [$currentId, $childId] = array_shift($queue);
            $current = $nodeMap[$currentId] ?? null;
            if (!$current) continue;

            $type = $current['type'] ?? '';

            if ($type === 'metric') {
                $sourceHandle = $childId
                    ? $this->findSourceHandleBetween($currentId, $childId, $forwardAdj)
                    : 'output';
                $metrics[] = [
                    'metric_type' => $current['settings']['metric_type'] ?? null,
                    'node_id' => $currentId,
                    'source_handle' => $sourceHandle,
                ];
            } elseif ($type === 'condition') {
                $conditions[] = $this->extractCondition($current);
                $conditionNodeIds[] = $currentId;
            } elseif (in_array($type, ['sustained', 'check_after'])) {
                $timingNodes[] = $this->extractTiming($current);
                $timingNodeIds[] = $currentId;
            }

            foreach ($reverseAdj[$currentId] ?? [] as $parentId) {
                if (!isset($visited[$parentId])) {
                    $visited[$parentId] = true;
                    $queue[] = [$parentId, $currentId];
                }
            }
        }

        $metrics = array_values(array_filter($metrics, fn($m) => $m['metric_type'] !== null));
        if (empty($metrics)) return [];

        $action = array_merge(['type' => $startNode['type']], $actionSettings);

        $postAction = $this->findPostAction($startNode['id'], $nodeMap, $forwardAdj);

        $rules = [];
        foreach ($metrics as $metric) {
            $rules[] = [
                'metric' => $metric['metric_type'],
                'metric_node_id' => $metric['node_id'],
                'metric_source_handle' => $metric['source_handle'],
                'condition' => $conditions[0] ?? null,
                'condition_node_id' => $conditionNodeIds[0] ?? null,
                'timing' => $timingNodes[0] ?? null,
                'timing_node_id' => $timingNodeIds[0] ?? null,
                'action' => $action,
                'action_node_id' => $startNode['id'],
                'post_action' => $postAction,
            ];
        }

        return $rules;
    }

    /**
     * Find the source handle on the edge from sourceNodeId to targetNodeId.
     */
    private function findSourceHandleBetween(string $sourceNodeId, string $targetNodeId, array $forwardAdj): string
    {
        foreach ($forwardAdj[$sourceNodeId] ?? [] as $edge) {
            if ($edge['target'] === $targetNodeId) {
                return $edge['sourceHandle'];
            }
        }
        return 'output';
    }

    /**
     * Find post-action nodes (repeat, check_after) connected downstream of an action.
     */
    private function findPostAction(string $actionNodeId, array $nodeMap, array $forwardAdj): ?array
    {
        foreach ($forwardAdj[$actionNodeId] ?? [] as $edge) {
            $targetNode = $nodeMap[$edge['target']] ?? null;
            if ($targetNode && in_array($targetNode['type'], ['repeat', 'check_after'])) {
                return [
                    'type' => $targetNode['type'],
                    'settings' => $targetNode['settings'] ?? [],
                    'node_id' => $edge['target'],
                ];
            }
        }
        return null;
    }

    /**
     * Group flat rules by metric_node_id, merging sub-branches.
     */
    private function groupByMetric(array $flatRules): array
    {
        $branches = [];

        foreach ($flatRules as $rule) {
            $key = $rule['metric_node_id'] . ':' . $rule['metric_source_handle'];

            if (!isset($branches[$key])) {
                $branches[$key] = [
                    'metric' => $rule['metric'],
                    'metric_node_id' => $rule['metric_node_id'],
                    'metric_source_handle' => $rule['metric_source_handle'],
                    'condition' => $rule['condition'],
                    'condition_node_id' => $rule['condition_node_id'],
                    'sub_branches' => [],
                ];
            }

            $branches[$key]['sub_branches'][] = [
                'timing' => $rule['timing'],
                'timing_node_id' => $rule['timing_node_id'],
                'action' => $rule['action'],
                'action_node_id' => $rule['action_node_id'],
                'post_action' => $rule['post_action'] ?? null,
            ];
        }

        return array_values($branches);
    }

    private function extractCondition(array $node): array
    {
        $settings = $node['settings'] ?? [];
        return [
            'operator' => $settings['operator'] ?? 'greater_than',
            'threshold' => $settings['threshold'] ?? null,
            'min' => $settings['min'] ?? null,
            'max' => $settings['max'] ?? null,
        ];
    }

    private function extractTiming(array $node): array
    {
        $settings = $node['settings'] ?? [];
        $type = $node['type'];

        $duration = null;
        if (isset($settings['duration'])) {
            $duration = BaseNode::parseDurationToMs($settings['duration']);
        }

        $interval = null;
        if (isset($settings['interval'])) {
            $interval = BaseNode::parseDurationToMs($settings['interval']);
        }

        return [
            'type' => $type,
            'duration_ms' => $duration,
            'interval_ms' => $interval,
            'max_repeats' => isset($settings['max_repeats']) ? (int) $settings['max_repeats'] : null,
        ];
    }
}
