<?php

namespace App\NodeConfig\NodeTypes;

use App\Enums\Severity;

class SeverityNode extends BaseNode
{
    public function getType(): string
    {
        return 'severity';
    }

    public function getCategory(): string
    {
        return 'condition';
    }

    public function getLabel(): string
    {
        return 'Severity';
    }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'severity', 'label' => 'Severity', 'type' => 'select', 'required' => true, 'default' => 'warning', 'options' => Severity::options()],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $input = $inputValues[0] ?? null;

        if ($input === null || ! $input) {
            return NodeResult::noPropagate(null, []);
        }

        $severityOverride = $inputValues[1] ?? null;
        $severity = $settings['severity'] ?? 'warning';

        if ($severityOverride !== null && Severity::tryFrom($severityOverride) !== null) {
            $severity = $severityOverride;
        }

        return NodeResult::propagate($severity, ['severity' => $severity]);
    }
}
