<?php

namespace App\NodeConfig\NodeTypes;

class DelayNode extends BaseNode
{
    public function getType(): string { return 'delay'; }
    public function getCategory(): string { return 'time'; }
    public function getLabel(): string { return 'Delay'; }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'duration', 'label' => 'Duration (MM:DD:HH:MM:SS)', 'type' => 'string', 'required' => true, 'default' => '00:00:10:00:00'],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $input = $inputValues[0] ?? null;

        if ($input === null) {
            return NodeResult::noPropagate(null, $state);
        }

        $timerPending = $state['timer_pending'] ?? false;
        $isTruthy = $input === true || (is_numeric($input) && (float) $input > 0) || $input === 'true';

        if ($isTruthy && !$timerPending) {
            $delayMs = static::parseDurationToSeconds($settings['duration'] ?? '00:00:10:00:00') * 1000;

            return new NodeResult(null, false, new NodeTimer($delayMs, ['input' => $input]), [
                'timer_pending' => true,
                'pending_input' => $input,
            ]);
        }

        if (!$isTruthy && $timerPending) {
            return NodeResult::noPropagate(null, [
                'timer_pending' => false,
                'pending_input' => null,
            ]);
        }

        if ($state['timer_fire'] ?? false) {
            $pendingInput = $state['pending_input'] ?? null;
            return NodeResult::propagate($pendingInput, [
                'timer_pending' => false,
                'pending_input' => null,
            ]);
        }

        return NodeResult::noPropagate(null, $state);
    }
}
