<?php

namespace App\NodeConfig\NodeTypes;

class TemplateNode extends BaseNode
{
    public function getType(): string
    {
        return 'template';
    }

    public function getCategory(): string
    {
        return 'condition';
    }

    public function getLabel(): string
    {
        return 'Template Input';
    }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'data_type', 'label' => 'Data Type', 'type' => 'select', 'required' => true, 'default' => 'number', 'options' => [
                'number' => 'Number',
                'string' => 'String',
                'boolean' => 'Boolean',
            ]],
            ['key' => 'template_id', 'label' => 'Key', 'type' => 'text', 'required' => true, 'default' => '', 'description' => 'Bare id injected at evaluation, e.g. port_ping_slow_threshold_ms', 'placeholder' => 'port_ping_slow_threshold_ms'],
            ['key' => 'value', 'label' => 'Value', 'type' => 'text', 'required' => false, 'default' => '', 'placeholder' => '200'],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $id = trim((string) ($settings['template_id'] ?? ''), '{}');
        $type = $settings['data_type'] ?? 'number';

        if ($id === '') {
            return NodeResult::noPropagate(null, $state);
        }

        // Resolve against whatever was injected into the evaluation context (extra_state).
        // Both the bare id and the {<id>} form are accepted.
        $value = array_key_exists($id, $state) ? $state[$id]
            : (array_key_exists('{'.$id.'}', $state) ? $state['{'.$id.'}'] : null);

        if ($value === null) {
            return NodeResult::noPropagate(null, $state);
        }

        return NodeResult::propagate($this->cast($value, $type));
    }

    private function cast(mixed $value, string $type): mixed
    {
        return match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOL),
            'string' => (string) $value,
            default => is_numeric($value) ? (float) $value : $value,
        };
    }
}
