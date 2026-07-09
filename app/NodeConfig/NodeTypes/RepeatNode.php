<?php

namespace App\NodeConfig\NodeTypes;

class RepeatNode extends BaseNode
{
    public function getType(): string { return 'repeat'; }
    public function getCategory(): string { return 'time'; }
    public function getLabel(): string { return 'Repeat'; }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'interval', 'label' => 'Interval (MM:DD:HH:MM:SS)', 'type' => 'string', 'required' => true, 'default' => '00:00:10:00:00'],
            ['key' => 'max_repeats', 'label' => 'Max Repeats', 'type' => 'number', 'default' => 0, 'description' => '0 = infinite'],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $repeatCount = (int) ($state['repeat_count'] ?? 0);
        $maxRepeats = (int) ($settings['max_repeats'] ?? 0);
        $isTimerFire = $state['timer_fire'] ?? false;

        if (!$isTimerFire) {
            $input = $inputValues[0] ?? null;
            $isTruthy = $input === true || (is_numeric($input) && (float) $input > 0);

            if ($isTruthy && $repeatCount === 0) {
                $newCount = 1;
                $scheduled = $this->scheduleNext($settings, $newCount, $maxRepeats);
                return NodeResult::withTimer($input, $scheduled, ['repeat_count' => $newCount, 'last_input' => $input]);
            }

            if (!$isTruthy && $repeatCount > 0) {
                return NodeResult::propagate(false, ['repeat_count' => 0, 'last_input' => null]);
            }

            return NodeResult::noPropagate(null, $state);
        }

        $lastInput = $state['last_input'] ?? null;
        $isStillTruthy = $lastInput === true || (is_numeric($lastInput) && (float) $lastInput > 0);

        if (!$isStillTruthy) {
            return NodeResult::propagate(false, ['repeat_count' => 0, 'last_input' => null]);
        }

        $newCount = $repeatCount + 1;
        if ($maxRepeats > 0 && $newCount > $maxRepeats) {
            return NodeResult::propagate($lastInput, ['repeat_count' => $newCount, 'last_input' => $lastInput]);
        }

        $scheduled = $this->scheduleNext($settings, $newCount, $maxRepeats);
        return NodeResult::withTimer($lastInput, $scheduled, ['repeat_count' => $newCount, 'last_input' => $lastInput]);
    }

    private function scheduleNext(array $settings, int $currentCount, int $maxRepeats): ?NodeTimer
    {
        if ($maxRepeats > 0 && $currentCount > $maxRepeats) {
            return null;
        }

        $delayMs = static::parseDurationToSeconds($settings['interval'] ?? '00:00:10:00:00') * 1000;

        return new NodeTimer($delayMs, ['repeat_fire' => true]);
    }
}
