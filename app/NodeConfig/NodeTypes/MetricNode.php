<?php

namespace App\NodeConfig\NodeTypes;

class MetricNode extends BaseNode
{
    public function getType(): string
    {
        return 'metric';
    }

    public function getCategory(): string
    {
        return 'metric';
    }

    public function getLabel(): string
    {
        return 'Metric';
    }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'metric_type', 'label' => 'Metric', 'type' => 'select', 'required' => true, 'default' => 'cpu_usage', 'options' => [
                'cpu_usage' => 'CPU Usage',
                'memory_usage' => 'Memory Usage',
                'disk_usage' => 'Disk Usage',
                'network_usage' => 'Network Usage',
                'server_status' => 'Server Status',
                'heartbeat_age' => 'Heartbeat Age',
                'ports_ping' => 'Ports Ping',
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
            $isOnline = $value === 'online' || $value === true || $value === 1;

            return NodeResult::multiOutput([
                'online' => $isOnline ? true : null,
                'offline' => ! $isOnline ? true : null,
            ], $state);
        }

        if ($metricType === 'ports_ping') {
            $isOffline = $value === 'offline' || $value === false || $value === 0 || $value === '0' || $value === null;

            return NodeResult::multiOutput([
                'timing' => $isOffline ? null : (float) $value,
                'offline' => $isOffline ? true : null,
            ], $state);
        }

        return NodeResult::propagate((float) $value);
    }
}
