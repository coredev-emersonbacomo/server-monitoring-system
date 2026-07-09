<?php

namespace App\NodeConfig\NodeTypes;

class CpuUsageNode extends BaseNode
{
    public function getType(): string { return 'cpu_usage'; }
    public function getCategory(): string { return 'metric'; }
    public function getLabel(): string { return 'CPU Usage'; }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $value = $state['metric_value'] ?? null;

        if ($value === null) {
            return NodeResult::noPropagate(null, $state);
        }

        return NodeResult::propagate((float) $value);
    }
}
