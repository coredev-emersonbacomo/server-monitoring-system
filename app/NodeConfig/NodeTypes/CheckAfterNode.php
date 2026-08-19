<?php

namespace App\NodeConfig\NodeTypes;

class CheckAfterNode extends BaseNode
{
    public function getType(): string
    {
        return 'check_after';
    }

    public function getCategory(): string
    {
        return 'time';
    }

    public function getLabel(): string
    {
        return 'Check After';
    }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'duration', 'label' => 'Duration (ms)', 'type' => 'string', 'required' => true, 'default' => '600000'],
            ['key' => 'repeat_interval', 'label' => 'Repeat Interval (ms)', 'type' => 'string', 'default' => ''],
            ['key' => 'repeat_max_repeats', 'label' => 'Max Repeats (-1 = infinite)', 'type' => 'number', 'default' => -1],
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
        $isTruthy = $input === true || (is_numeric($input) && (float) $input > 0) || $input === 'true';

        return match ($phase) {
            'firing' => $isTruthy
                ? NodeResult::noPropagate(null, $state)
                : NodeResult::cancelTimers($this->idleState()),

            'pending' => $isTruthy
                ? NodeResult::noPropagate(null, $state)
                : NodeResult::cancelTimers($this->idleState()),

            default => $isTruthy
                ? NodeResult::noPropagate(
                    new NodeTimer($cfg['duration_ms'], ['input' => $input]),
                    ['phase' => 'pending', 'pending_input' => $input, 'repeat_count' => 0]
                )
                : NodeResult::propagate(false, $this->idleState()),
        };
    }

    private function onTimerFire(array $cfg, array $state): NodeResult
    {
        $isRepeat = $state['repeat_fire'] ?? false;
        $repeatCount = (int) ($state['repeat_count'] ?? 0) + ($isRepeat ? 1 : 0);
        $pendingInput = $state['pending_input'] ?? null;

        if (! $pendingInput) {
            return NodeResult::propagate(false, $this->idleState());
        }

        $firingState = ['phase' => 'firing', 'pending_input' => $pendingInput, 'repeat_count' => $repeatCount];

        if ($cfg['has_repeat'] && ($cfg['max_repeats'] <= 0 || $repeatCount < $cfg['max_repeats'])) {
            return NodeResult::withTimer(
                $pendingInput,
                new NodeTimer($cfg['repeat_interval_ms'], ['repeat_fire' => true]),
                $firingState
            );
        }

        return NodeResult::propagate($pendingInput, $firingState);
    }

    private function idleState(): array
    {
        return ['phase' => 'idle', 'pending_input' => null, 'repeat_count' => 0];
    }

    private function parseConfig(array $settings): array
    {
        $durationMs = static::parseDurationToMs($settings['duration'] ?? '600000');
        $repeatIntervalMs = static::parseDurationToMs($settings['repeat_interval'] ?? '0');

        return [
            'duration_ms' => $durationMs,
            'repeat_interval_ms' => $repeatIntervalMs,
            'max_repeats' => (int) ($settings['repeat_max_repeats'] ?? -1),
            'has_repeat' => $repeatIntervalMs > 0,
        ];
    }
}
