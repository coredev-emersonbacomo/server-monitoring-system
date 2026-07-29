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
            ['key' => 'interval', 'label' => 'Interval (ms)', 'type' => 'string', 'required' => true, 'default' => '600000'],
            ['key' => 'max_repeats', 'label' => 'Max Repeats (-1 = infinite)', 'type' => 'number', 'default' => -1, 'description' => '-1 = infinite'],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $cfg = $this->parseConfig($settings);

        return ($state['timer_fire'] ?? false)
            ? $this->onTimerFire($cfg, $state)
            : $this->onHeartbeat($cfg, $state, $inputValues[0] ?? null);
    }

    private function onHeartbeat(array $cfg, array $state, mixed $input): NodeResult
    {
        $phase = $state['phase'] ?? 'idle';
        $isTruthy = $input === true || (is_numeric($input) && (float) $input > 0);

        if (!$isTruthy) {
            return NodeResult::cancelTimers($this->idleState());
        }

        if ($phase === 'idle') {
            $newCount = 1;
            $scheduled = $this->scheduleNext($cfg['interval_ms'], $newCount, $cfg['max_repeats']);

            return NodeResult::withTimer($input, $scheduled, [
                'phase' => 'repeating',
                'repeat_count' => $newCount,
                'last_input' => $input,
            ]);
        }

        // Currently repeating: maintain existing state / wait for repeat timer
        return NodeResult::noPropagate(null, $state);
    }

    private function onTimerFire(array $cfg, array $state): NodeResult
    {
        $lastInput = $state['last_input'] ?? null;
        $isStillTruthy = $lastInput === true || (is_numeric($lastInput) && (float) $lastInput > 0);

        if (!$isStillTruthy) {
            return NodeResult::propagate(false, $this->idleState());
        }

        $repeatCount = (int) ($state['repeat_count'] ?? 0) + 1;

        if ($cfg['max_repeats'] > 0 && $repeatCount > $cfg['max_repeats']) {
            return NodeResult::propagate($lastInput, [
                'phase' => 'idle',
                'repeat_count' => $repeatCount,
                'last_input' => $lastInput,
            ]);
        }

        $scheduled = $this->scheduleNext($cfg['interval_ms'], $repeatCount, $cfg['max_repeats']);

        return NodeResult::withTimer($lastInput, $scheduled, [
            'phase' => 'repeating',
            'repeat_count' => $repeatCount,
            'last_input' => $lastInput,
        ]);
    }

    private function idleState(): array
    {
        return ['phase' => 'idle', 'repeat_count' => 0, 'last_input' => null];
    }

    private function parseConfig(array $settings): array
    {
        return [
            'interval_ms' => static::parseDurationToMs($settings['interval'] ?? '600000'),
            'max_repeats' => (int) ($settings['max_repeats'] ?? -1),
        ];
    }

    private function scheduleNext(int $intervalMs, int $currentCount, int $maxRepeats): ?NodeTimer
    {
        if ($maxRepeats > 0 && $currentCount >= $maxRepeats) {
            return null;
        }

        return new NodeTimer($intervalMs, ['repeat_fire' => true]);
    }
}
