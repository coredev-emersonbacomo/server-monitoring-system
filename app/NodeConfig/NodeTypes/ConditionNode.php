<?php

namespace App\NodeConfig\NodeTypes;

class ConditionNode extends BaseNode
{
    public function getType(): string { return 'condition'; }
    public function getCategory(): string { return 'condition'; }
    public function getLabel(): string { return 'Condition'; }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'operator', 'label' => 'Operator', 'type' => 'select', 'required' => true, 'default' => 'greater_than', 'options' => [
                'greater_than' => 'Greater Than (> )',
                'greater_than_equal' => 'Greater Than or Equal (>=)',
                'less_than' => 'Less Than (< )',
                'less_than_equal' => 'Less Than or Equal (<=)',
                'equal' => 'Equal (=)',
                'between' => 'Between',
            ]],
            ['key' => 'threshold', 'label' => 'Threshold', 'type' => 'number', 'required' => true, 'default' => 0],
            ['key' => 'min', 'label' => 'Min', 'type' => 'number', 'required' => true, 'default' => 0],
            ['key' => 'max', 'label' => 'Max', 'type' => 'number', 'required' => true, 'default' => 0],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $operator = $settings['operator'] ?? 'greater_than';
        $a = $inputValues[0] ?? null;
        $b = $inputValues[1] ?? null;

        return match ($operator) {
            'equal' => $this->evaluateEqual($a, $b, $settings),
            'between' => $this->evaluateBetween($a, $inputValues, $settings),
            'less_than' => $this->evaluateLessThan($a, $b, $settings),
            'less_than_equal' => $this->evaluateLessThanEqual($a, $b, $settings),
            'greater_than_equal' => $this->evaluateGreaterThanEqual($a, $b, $settings),
            default => $this->evaluateGreaterThan($a, $b, $settings),
        };
    }

    private function evaluateGreaterThan(mixed $a, mixed $b, array $settings): NodeResult
    {
        if ($a === null || !is_numeric($a)) {
            return NodeResult::propagate(false);
        }
        $b = $b !== null ? (float) $b : (float) ($settings['threshold'] ?? 0);
        return NodeResult::propagate((float) $a > $b);
    }

    private function evaluateLessThan(mixed $a, mixed $b, array $settings): NodeResult
    {
        if ($a === null || !is_numeric($a)) {
            return NodeResult::propagate(false);
        }
        $b = $b !== null ? (float) $b : (float) ($settings['threshold'] ?? 0);
        return NodeResult::propagate((float) $a < $b);
    }

    private function evaluateGreaterThanEqual(mixed $a, mixed $b, array $settings): NodeResult
    {
        if ($a === null || !is_numeric($a)) {
            return NodeResult::propagate(false);
        }
        $b = $b !== null ? (float) $b : (float) ($settings['threshold'] ?? 0);
        return NodeResult::propagate((float) $a >= $b);
    }

    private function evaluateLessThanEqual(mixed $a, mixed $b, array $settings): NodeResult
    {
        if ($a === null || !is_numeric($a)) {
            return NodeResult::propagate(false);
        }
        $b = $b !== null ? (float) $b : (float) ($settings['threshold'] ?? 0);
        return NodeResult::propagate((float) $a <= $b);
    }

    private function evaluateEqual(mixed $a, mixed $b, array $settings): NodeResult
    {
        if ($b === null) {
            $b = $settings['threshold'] ?? null;
        }
        return NodeResult::propagate((string) $a === (string) $b);
    }

    private function evaluateBetween(mixed $a, array $inputValues, array $settings): NodeResult
    {
        if ($a === null || !is_numeric($a)) {
            return NodeResult::propagate(false);
        }
        $min = $inputValues[1] ?? null;
        $max = $inputValues[2] ?? null;
        $min = $min !== null ? (float) $min : (float) ($settings['min'] ?? 0);
        $max = $max !== null ? (float) $max : (float) ($settings['max'] ?? 0);
        return NodeResult::propagate((float) $a >= $min && (float) $a <= $max);
    }
}
