<?php

namespace App\NodeConfig\NodeTypes;

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
        $accumulated = (float) ($state['accumulated_seconds'] ?? 0);
        $lastTimestamp = (float) ($state['last_timestamp'] ?? 0);
        $now = microtime(true);
        $alreadyFired = $state['already_fired'] ?? false;

        $requiredSeconds = static::parseDurationToSeconds($settings['duration'] ?? '00:00:05:00:00');

        if ($alreadyFired) {
            if (!$input) {
                return NodeResult::propagate(false, ['accumulated_seconds' => 0, 'last_timestamp' => 0, 'already_fired' => false]);
            }
            return NodeResult::propagate(true, $state);
        }

        if ($input) {
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
}
