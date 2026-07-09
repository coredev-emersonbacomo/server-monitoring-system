<?php

namespace App\NodeConfig\Validation;

class NodeConfigValidator
{
    private array $errors = [];

    public function validate(array $config): bool
    {
        $this->errors = [];
        $nodes = $config['nodes'] ?? [];
        $edges = $config['edges'] ?? [];

        if (empty($nodes)) {
            $this->errors[] = 'Node config must contain at least one node.';
            return false;
        }

        $nodeIds = [];
        foreach ($nodes as $index => $node) {
            if (empty($node['id'])) {
                $this->errors[] = "Node at index $index is missing an id.";
                continue;
            }
            $nodeIds[] = $node['id'];
            if (empty($node['type'])) {
                $this->errors[] = "Node {$node['id']} is missing a type.";
            }
        }

        $nodeIdSet = array_flip($nodeIds);

        foreach ($edges as $index => $edge) {
            if (empty($edge['source']) || empty($edge['target'])) {
                $this->errors[] = "Edge at index $index is missing source or target.";
                continue;
            }
            if (!isset($nodeIdSet[$edge['source']])) {
                $this->errors[] = "Edge references unknown source node: {$edge['source']}.";
            }
            if (!isset($nodeIdSet[$edge['target']])) {
                $this->errors[] = "Edge references unknown target node: {$edge['target']}.";
            }
            if ($edge['source'] === $edge['target']) {
                $this->errors[] = "Edge {$edge['id']} is a self-loop (source = target).";
            }
        }

        // Check for cycles using DFS
        if ($this->hasCycle($nodes, $edges)) {
            $this->errors[] = 'Node config graph contains cycles. Cycles are not allowed.';
        }

        return empty($this->errors);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    private function buildAdjacencyList(array $nodes, array $edges): array
    {
        $adj = [];
        foreach ($nodes as $node) {
            $adj[$node['id']] = [];
        }
        foreach ($edges as $edge) {
            $source = $edge['source'];
            $target = $edge['target'];
            if (isset($adj[$source])) {
                $adj[$source][] = $target;
            }
        }
        return $adj;
    }

    private function hasCycle(array $nodes, array $edges): bool
    {
        $adj = $this->buildAdjacencyList($nodes, $edges);
        $visited = [];
        $recStack = [];

        foreach ($adj as $nodeId => $neighbors) {
            $visited[$nodeId] = false;
            $recStack[$nodeId] = false;
        }

        foreach ($adj as $nodeId => $neighbors) {
            if ($this->dfsCycle($nodeId, $adj, $visited, $recStack)) {
                return true;
            }
        }

        return false;
    }

    private function dfsCycle(string $node, array &$adj, array &$visited, array &$recStack): bool
    {
        if (!$visited[$node]) {
            $visited[$node] = true;
            $recStack[$node] = true;

            foreach ($adj[$node] as $neighbor) {
                if (!isset($visited[$neighbor])) continue;
                if (!$visited[$neighbor] && $this->dfsCycle($neighbor, $adj, $visited, $recStack)) {
                    return true;
                } elseif ($recStack[$neighbor]) {
                    return true;
                }
            }
        }

        $recStack[$node] = false;
        return false;
    }

    public function topologicalSort(array $nodes, array $edges): array
    {
        $adj = $this->buildAdjacencyList($nodes, $edges);
        $inDegree = [];

        foreach ($nodes as $node) {
            $inDegree[$node['id']] = 0;
        }

        foreach ($edges as $edge) {
            $target = $edge['target'];
            if (isset($inDegree[$target])) {
                $inDegree[$target]++;
            }
        }

        $queue = [];
        foreach ($inDegree as $id => $deg) {
            if ($deg === 0) {
                $queue[] = $id;
            }
        }

        $sorted = [];
        while (!empty($queue)) {
            $current = array_shift($queue);
            $sorted[] = $current;

            foreach ($adj[$current] as $neighbor) {
                $inDegree[$neighbor]--;
                if ($inDegree[$neighbor] === 0) {
                    $queue[] = $neighbor;
                }
            }
        }

        return $sorted;
    }
}
