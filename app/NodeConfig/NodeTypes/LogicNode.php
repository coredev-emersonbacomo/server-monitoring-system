<?php

namespace App\NodeConfig\NodeTypes;

class LogicNode extends BaseNode
{
    public function getType(): string { return 'logic'; }
    public function getCategory(): string { return 'logic'; }
    public function getLabel(): string { return 'Logic'; }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'operation', 'label' => 'Operation', 'type' => 'select', 'required' => true, 'options' => [
                'and' => 'AND',
                'or' => 'OR',
                'not' => 'NOT',
            ]],
        ];
    }

    public function acceptsUnlimitedInputs(): bool
    {
        return true;
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $operation = $settings['operation'] ?? 'and';

        return match ($operation) {
            'or' => $this->evaluateOr($inputValues),
            'not' => $this->evaluateNot($inputValues),
            default => $this->evaluateAnd($inputValues),
        };
    }

    private function evaluateAnd(array $inputValues): NodeResult
    {
        foreach ($inputValues as $val) {
            if (!$val) return NodeResult::propagate(false);
        }
        return NodeResult::propagate(true);
    }

    private function evaluateOr(array $inputValues): NodeResult
    {
        foreach ($inputValues as $val) {
            if ($val) return NodeResult::propagate(true);
        }
        return NodeResult::propagate(false);
    }

    private function evaluateNot(array $inputValues): NodeResult
    {
        $input = $inputValues[0] ?? null;
        return NodeResult::propagate(!$input);
    }
}
