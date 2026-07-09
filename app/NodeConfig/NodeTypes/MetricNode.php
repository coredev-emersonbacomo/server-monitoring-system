<?php

namespace App\NodeConfig\NodeTypes;

class MetricNode extends BaseNode
{
    public function getType(): string { return 'metric'; }
    public function getCategory(): string { return 'metric'; }
    public function getLabel(): string { return 'Metric'; }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'metric_type', 'label' => 'Metric', 'type' => 'select', 'required' => true, 'options' => [
                'cpu_usage' => 'CPU Usage',
                'memory_usage' => 'Memory Usage',
                'disk_usage' => 'Disk Usage',
                'network_usage' => 'Network Usage',
                'server_status' => 'Server Status',
                'heartbeat_age' => 'Heartbeat Age',
            ]],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $metricType = $settings['metric_type'] ?? 'cpu_usage';
        $value = $state['metric_value'] ?? null;

        if ($value === null) {
            return NodeResult::noPropagate(null, $state);
        }

        if ($metricType === 'server_status') {
            return NodeResult::propagate($value === 'online' || $value === true || $value === 1);
        }

        return NodeResult::propagate((float) $value);
    }
}
