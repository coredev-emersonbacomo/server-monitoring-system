<?php

namespace App\NodeConfig\NodeTypes;

class ServerStatusNode extends BaseNode
{
    public function getType(): string { return 'server_status'; }
    public function getCategory(): string { return 'metric'; }
    public function getLabel(): string { return 'Server Status'; }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $value = $state['metric_value'] ?? null;

        if ($value === null) {
            return NodeResult::noPropagate(null, $state);
        }

        return NodeResult::propagate($value === 'online' || $value === true || $value === 1);
    }
}
