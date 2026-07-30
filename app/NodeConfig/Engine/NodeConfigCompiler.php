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

        $branches = $this->groupByMetric($flatRules, $forwardAdj);

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
                $conditions[] = array_merge(
                    ['type' => 'condition'],
                    $this->extractCondition($current),
                );
                $conditionNodeIds[] = $currentId;
            } elseif ($type === 'severity') {
                $settings = $current['settings'] ?? [];
                $conditions[] = [
                    'type' => 'severity',
                    'severity' => $settings['severity'] ?? 'warning',
                ];
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
     * Also resolves chain ordering (chain_prev/chain_next) for stacked timing nodes.
     */
    private function groupByMetric(array $flatRules, array $forwardAdj = []): array
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
                'chain_prev' => null,
                'chain_next' => null,
            ];
        }

        // Resolve chain ordering then collapse into single timing_chain sub_branches
        foreach ($branches as &$branch) {
            $this->resolveChainOrder($branch, $forwardAdj);
            $this->mergeChainedSubBranches($branch);
        }
        unset($branch);

        return array_values($branches);
    }

    /**
     * Collapse sub_branches connected via chain-out → chain-in into a single sub_branch
     * with a `timing_chain` steps array. This means the whole chain shares one task ID,
     * so cancellation, guards, and state all operate as a single unit.
     */
    private function mergeChainedSubBranches(array &$branch): void
    {
        $subBranches = $branch['sub_branches'];

        // Check if any chain connections were detected
        $hasChains = false;
        foreach ($subBranches as $sb) {
            if (!empty($sb['chain_next'])) {
                $hasChains = true;
                break;
            }
        }

        if (!$hasChains) {
            // No chains — just strip the chain fields and leave sub_branches as-is
            foreach ($branch['sub_branches'] as &$sb) {
                unset($sb['chain_prev'], $sb['chain_next']);
            }
            unset($sb);
            return;
        }

        $merged = [];
        foreach ($subBranches as $sb) {
            // Skip downstream chain nodes; they are included under their root
            if (!empty($sb['chain_prev'])) {
                continue;
            }

            if (!empty($sb['chain_next'])) {
                // Chain root — walk forward and collect all steps
                $chain = [];
                $current = $sb;
                while ($current !== null) {
                    $chain[] = [
                        'step'           => count($chain),
                        'timing_node_id' => $current['timing_node_id'],
                        'timing'         => $current['timing'],
                        'action_node_id' => $current['action_node_id'],
                        'action'         => $current['action'],
                        'post_action'    => $current['post_action'],
                    ];
                    if (!empty($current['chain_next'])) {
                        $nextId = $current['chain_next'];
                        $current = null;
                        foreach ($subBranches as $nextSb) {
                            if ($nextSb['timing_node_id'] === $nextId) {
                                $current = $nextSb;
                                break;
                            }
                        }
                    } else {
                        $current = null;
                    }
                }

                // Derive a synthetic ID for the compiled chain node from all step IDs
                $chainNodeId = 'chain:' . implode(':', array_column($chain, 'timing_node_id'));

                // Max duration = last step's absolute duration_ms — used as single timer delay
                $maxDurationMs = end($chain)['timing']['duration_ms'] ?? 0;
                $lastStep      = end($chain);

                $merged[] = [
                    'timing_node_id' => $chainNodeId,                        // Synthetic compiled chain node ID
                    'timing'         => $sb['timing'],                       // first step timing (heartbeat ref)
                    'action'         => $lastStep['action'] ?? null,         // last step action
                    'action_node_id' => $lastStep['action_node_id'] ?? null,  // last step action node ID
                    'post_action'    => $lastStep['post_action'] ?? null,    // last step post_action (repeat)
                    'timing_chain'   => $chain,
                    'max_duration_ms' => $maxDurationMs,                     // ONE timer fires at this delay
                ];
            } else {
                // Standalone sub_branch (not part of any chain)
                unset($sb['chain_prev'], $sb['chain_next']);
                $merged[] = $sb;
            }
        }

        $branch['sub_branches'] = $merged;
    }

    /**
     * Sort sub_branches by timing duration_ms ascending and wire up chain_prev/chain_next
     * based on `chain-out` → `chain-in` edges between timing nodes.
     *
     * This ensures heartbeat evaluation only starts at the first (shortest) sustained node,
     * and each fired node schedules the next one in sequence rather than all firing in parallel.
     */
    private function resolveChainOrder(array &$branch, array $forwardAdj): void
    {
        $subBranches = &$branch['sub_branches'];

        if (count($subBranches) <= 1) {
            return;
        }

        // Sort ascending by duration_ms (nodes without a duration sort to the end)
        usort($subBranches, function ($a, $b) {
            $da = $a['timing']['duration_ms'] ?? PHP_INT_MAX;
            $db = $b['timing']['duration_ms'] ?? PHP_INT_MAX;
            return $da <=> $db;
        });

        // Build a map: timing_node_id → index in sub_branches
        $nodeIndex = [];
        foreach ($subBranches as $i => $sb) {
            if ($sb['timing_node_id']) {
                $nodeIndex[$sb['timing_node_id']] = $i;
            }
        }

        // Detect chain-out → chain-in connections in forwardAdj
        foreach ($subBranches as &$sb) {
            if (!$sb['timing_node_id']) {
                continue;
            }
            foreach ($forwardAdj[$sb['timing_node_id']] ?? [] as $edge) {
                if (($edge['sourceHandle'] ?? 'output') === 'chain-out') {
                    $nextNodeId = $edge['target'];
                    if (isset($nodeIndex[$nextNodeId])) {
                        $sb['chain_next'] = $nextNodeId;
                        $subBranches[$nodeIndex[$nextNodeId]]['chain_prev'] = $sb['timing_node_id'];
                    }
                }
            }
        }
        unset($sb);
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
