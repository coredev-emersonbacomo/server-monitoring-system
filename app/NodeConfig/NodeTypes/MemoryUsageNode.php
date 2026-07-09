<?php

namespace App\NodeConfig\NodeTypes;

class MemoryUsageNode extends BaseNode
{
    public function getType(): string { return 'memory_usage'; }
    public function getCategory(): string { return 'metric'; }
    public function getLabel(): string { return 'Memory Usage'; }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $value = $state['metric_value'] ?? null;

        if ($value === null) {
            return NodeResult::noPropagate(null, $state);
        }

        return NodeResult::propagate((float) $value);
    }
}
