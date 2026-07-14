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
            ['key' => 'max_repeats', 'label' => 'Max Repeats (0 = infinite)', 'type' => 'number', 'default' => 0, 'description' => '0 = infinite'],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $repeatCount = (int) ($state['repeat_count'] ?? 0);
        $maxRepeats = (int) ($settings['max_repeats'] ?? 0);
        $isTimerFire = $state['timer_fire'] ?? false;
        $hasSustainedAncestor = $state['has_sustained_ancestor'] ?? false;
        $sustainDurationSeconds = (int) ($state['sustain_duration_seconds'] ?? 0);

        $intervalSeconds = static::parseDurationToSeconds($settings['interval'] ?? '00:00:10:00:00');

        if (!$isTimerFire) {
            $input = $inputValues[0] ?? null;
            $isTruthy = $input === true || (is_numeric($input) && (float) $input > 0);

            if ($isTruthy && $repeatCount === 0) {
                $newCount = 1;
                $scheduled = $this->scheduleNext($intervalSeconds, $newCount, $maxRepeats);

                $newState = ['repeat_count' => $newCount, 'last_input' => $input];
                if ($hasSustainedAncestor) {
                    $newState['accumulated_extra_seconds'] = $intervalSeconds * $newCount;
                }

                return NodeResult::withTimer($input, $scheduled, $newState);
            }

            if (!$isTruthy && $repeatCount > 0) {
                return NodeResult::propagate(false, ['repeat_count' => 0, 'last_input' => null, 'accumulated_extra_seconds' => 0]);
            }

            return NodeResult::noPropagate(null, $state);
        }

        $lastInput = $state['last_input'] ?? null;
        $isStillTruthy = $lastInput === true || (is_numeric($lastInput) && (float) $lastInput > 0);

        if (!$isStillTruthy) {
            return NodeResult::propagate(false, ['repeat_count' => 0, 'last_input' => null, 'accumulated_extra_seconds' => 0]);
        }

        $newCount = $repeatCount + 1;
        if ($maxRepeats > 0 && $newCount > $maxRepeats) {
            return NodeResult::propagate($lastInput, [
                'repeat_count' => $newCount,
                'last_input' => $lastInput,
                'accumulated_extra_seconds' => $intervalSeconds * $newCount,
            ]);
        }

        $scheduled = $this->scheduleNext($intervalSeconds, $newCount, $maxRepeats);

        $newState = ['repeat_count' => $newCount, 'last_input' => $lastInput];
        if ($hasSustainedAncestor) {
            $newState['accumulated_extra_seconds'] = $intervalSeconds * $newCount;
        }

        return NodeResult::withTimer($lastInput, $scheduled, $newState);
    }

    private function scheduleNext(int $intervalSeconds, int $currentCount, int $maxRepeats): ?NodeTimer
    {
        if ($maxRepeats > 0 && $currentCount >= $maxRepeats) {
            return null;
        }

        $delayMs = $intervalSeconds * 1000;

        return new NodeTimer($delayMs, ['repeat_fire' => true]);
    }
}
