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

        $isOnline = $value === 'online' || $value === true || $value === 1;

        return NodeResult::multiOutput(
            [
                'online' => $isOnline ? true : null,
                'offline' => !$isOnline ? true : null,
            ],
            $state,
        );
    }
}
