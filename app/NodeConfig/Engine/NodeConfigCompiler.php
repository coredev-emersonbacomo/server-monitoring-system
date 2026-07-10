<?php

namespace App\NodeConfig\Engine;

use App\NodeConfig\NodeTypes\BaseNode;

class NodeConfigCompiler
{
    private const CATEGORY_MAP = [
        'metric' => 'metric',
        'condition' => 'condition',
        'logic' => 'logic',
        'delay' => 'time',
        'sustained' => 'time',
        'repeat' => 'time',
        'notification' => 'action',
    ];

    /**
     * Compile a node config graph into a flat ruleset.
     *
     * @param array{nodes: array, edges: array} $config
     * @return array{rules: array}
     */
    public function compile(array $config): array
    {
        $nodes = $config['nodes'] ?? [];
        $edges = $config['edges'] ?? [];

        if (empty($nodes)) {
            return ['rules' => []];
        }

        $nodeMap = [];
        foreach ($nodes as $node) {
            $nodeMap[$node['id']] = $node;
        }

        $reverseAdj = [];
        foreach ($edges as $edge) {
            $reverseAdj[$edge['target']][] = $edge['source'];
        }

        $actionNodes = array_filter($nodes, fn($n) => ($n['type'] ?? '') === 'notification');

        $rules = [];
        foreach ($actionNodes as $actionNode) {
            $rule = $this->traceBackward($actionNode, $nodeMap, $reverseAdj);
            if ($rule !== null) {
                $rules[] = $rule;
            }
        }

        return ['rules' => $rules];
    }

    private function traceBackward(array $startNode, array $nodeMap, array $reverseAdj): ?array
    {
        $metrics = [];
        $conditions = [];
        $logic = null;
        $timing = null;
        $actionSettings = $startNode['settings'] ?? [];

        $queue = [$startNode['id']];
        $visited = [$startNode['id'] => true];

        while (!empty($queue)) {
            $currentId = array_shift($queue);
            $current = $nodeMap[$currentId] ?? null;
            if (!$current) {
                continue;
            }

            $category = self::CATEGORY_MAP[$current['type']] ?? null;

            match ($category) {
                'metric' => $metrics[] = $current['settings']['metric_type'] ?? null,
                'condition' => $conditions[] = $this->extractCondition($current),
                'logic' => $logic = $current['settings']['operation'] ?? 'and',
                'time' => $timing = $this->extractTiming($current),
                default => null,
            };

            foreach ($reverseAdj[$currentId] ?? [] as $parentId) {
                if (!isset($visited[$parentId])) {
                    $visited[$parentId] = true;
                    $queue[] = $parentId;
                }
            }
        }

        $metrics = array_values(array_filter(array_unique($metrics)));
        if (empty($metrics)) {
            return null;
        }

        $actions = [array_merge(['type' => $startNode['type']], $actionSettings)];

        return [
            'metrics' => $metrics,
            'conditions' => $conditions,
            'logic' => $logic ?? 'and',
            'timing' => $timing,
            'actions' => $actions,
        ];
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
            $duration = BaseNode::parseDurationToSeconds($settings['duration']);
        }

        $interval = null;
        if (isset($settings['interval'])) {
            $interval = BaseNode::parseDurationToSeconds($settings['interval']);
        }

        return [
            'type' => $type,
            'duration_seconds' => $duration,
            'interval_seconds' => $interval,
            'max_repeats' => isset($settings['max_repeats']) ? (int) $settings['max_repeats'] : null,
        ];
    }
}
