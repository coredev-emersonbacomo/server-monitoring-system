<?php

namespace App\NodeConfig\NodeTypes;

class HeartbeatAgeNode extends BaseNode
{
    public function getType(): string
    {
        return 'heartbeat_age';
    }

    public function getCategory(): string
    {
        return 'metric';
    }

    public function getLabel(): string
    {
        return 'Heartbeat Age';
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $value = $state['metric_value'] ?? null;

        if ($value === null) {
            return NodeResult::noPropagate(null, $state);
        }

        return NodeResult::propagate((float) $value);
    }
}
