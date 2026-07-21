<?php

namespace App\NodeConfig\NodeTypes;

use App\Models\Agent;
use App\Models\MetricBatch;
use App\Models\MetricSample;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;

class SustainedNode extends BaseNode
{
    public function getType(): string { return 'sustained'; }
    public function getCategory(): string { return 'time'; }
    public function getLabel(): string { return 'Sustained'; }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'duration', 'label' => 'Duration (MM:DD:HH:MM:SS)', 'type' => 'string', 'required' => true, 'default' => '00:00:05:00:00'],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $input = $inputValues[0] ?? null;
        $requiredSeconds = static::parseDurationToSeconds($settings['duration'] ?? '00:00:05:00:00');
        $extraSeconds = (int) ($state['extra_sustain_seconds'] ?? 0);
        $requiredSeconds += $extraSeconds;

        $serverId = $state['server_id'] ?? null;
        $metricType = $state['metric_type'] ?? null;
        $threshold = $state['threshold'] ?? null;
        $operator = $state['operator'] ?? 'greater_than';

        if ($serverId && $metricType) {
            $conditionMet = $this->checkHistoricalCondition(
                $serverId,
                $metricType,
                $threshold,
                $operator,
                $requiredSeconds
            );

            $alreadyFired = $state['already_fired'] ?? false;

            if ($conditionMet && !$alreadyFired) {
                return NodeResult::propagate(true, ['already_fired' => true]);
            }

            if ($conditionMet && $alreadyFired) {
                return NodeResult::noPropagate(null, $state);
            }

            if (!$conditionMet) {
                return NodeResult::propagate(false, ['already_fired' => false]);
            }
        }

        $alreadyFired = $state['already_fired'] ?? false;

        if ($alreadyFired) {
            if (!$input) {
                return NodeResult::propagate(false, ['already_fired' => false]);
            }
            return NodeResult::noPropagate(null, $state);
        }

        if ($input) {
            $accumulated = (float) ($state['accumulated_seconds'] ?? 0);
            $lastTimestamp = (float) ($state['last_timestamp'] ?? 0);
            $now = microtime(true);

            if ($lastTimestamp > 0) {
                $accumulated += ($now - $lastTimestamp);
            }

            $newState = [
                'accumulated_seconds' => $accumulated,
                'last_timestamp' => $now,
                'already_fired' => false,
            ];

            if ($accumulated >= $requiredSeconds) {
                $newState['already_fired'] = true;
                return NodeResult::propagate(true, $newState);
            }

            return NodeResult::noPropagate(null, $newState);
        }

        return NodeResult::propagate(false, ['accumulated_seconds' => 0, 'last_timestamp' => 0, 'already_fired' => false]);
    }

    private function checkHistoricalCondition(
        int $serverId,
        string $metricType,
        ?float $threshold,
        string $operator,
        int $requiredSeconds
    ): bool {
        if ($metricType === 'server_status') {
            return $this->checkServerStatusCondition($serverId, $requiredSeconds);
        }

        if ($threshold === null) {
            return false;
        }

        return $this->checkMetricCondition($serverId, $metricType, $threshold, $operator, $requiredSeconds);
    }

    private function checkServerStatusCondition(int $serverId, int $requiredSeconds): bool
    {
        $agent = Agent::where('server_id', $serverId)->first();

        if (!$agent || !$agent->last_seen_at) {
            return true;
        }

        $offlineThresholdMinutes = (int) Setting::get('offline_threshold', '5');
        $offlineThresholdSeconds = $offlineThresholdMinutes * 60;

        return $agent->last_seen_at->lt(now()->subSeconds($offlineThresholdSeconds + $requiredSeconds));
    }

    private function checkMetricCondition(
        int $serverId,
        string $metricType,
        float $threshold,
        string $operator,
        int $requiredSeconds
    ): bool {
        $since = now()->subSeconds($requiredSeconds);

        $agent = Agent::where('server_id', $serverId)->first();
        if (!$agent) {
            return false;
        }

        $metricNameMap = [
            'cpu_usage' => 'load1',
            'memory_usage' => 'percent',
            'disk_usage' => 'percent',
            'network_usage' => 'rx_bytes',
        ];

        $metricName = $metricNameMap[$metricType] ?? $metricType;

        $metricTypeForQuery = $metricType;
        if (in_array($metricType, ['cpu_usage', 'memory_usage', 'disk_usage', 'network_usage'])) {
            $metricTypeForQuery = strtok($metricType, '_');
        }

        $sampleCount = MetricSample::whereHas('batch', function ($q) use ($agent, $since) {
            $q->where('agent_id', $agent->id)
              ->where('recorded_at', '>=', $since);
        })
        ->where('metric_type', $metricTypeForQuery)
        ->where('metric_name', $metricName)
        ->count();

        if ($sampleCount === 0) {
            return false;
        }

        $violatingCount = MetricSample::whereHas('batch', function ($q) use ($agent, $since) {
            $q->where('agent_id', $agent->id)
              ->where('recorded_at', '>=', $since);
        })
        ->where('metric_type', $metricTypeForQuery)
        ->where('metric_name', $metricName)
        ->where(function ($q) use ($operator, $threshold) {
            match ($operator) {
                'greater_than' => $q->where('value', '>', $threshold),
                'less_than' => $q->where('value', '<', $threshold),
                'equal' => $q->where('value', '=', $threshold),
                'between' => $q->where('value', '<', $threshold),
                default => $q->where('value', '>', $threshold),
            };
        })
        ->count();

        return $sampleCount > 0 && $violatingCount === $sampleCount;
    }
}
