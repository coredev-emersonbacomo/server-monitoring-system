<?php

namespace App\NodeConfig\NodeTypes;

class NotificationNode extends BaseNode
{
    public function getType(): string { return 'notification'; }
    public function getCategory(): string { return 'action'; }
    public function getLabel(): string { return 'Notification'; }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'channel', 'label' => 'Channel', 'type' => 'select', 'required' => true, 'options' => [
                'email' => 'Email',
                'sms' => 'SMS',
                'discord' => 'Discord',
            ]],
            ['key' => 'subject', 'label' => 'Subject', 'type' => 'string', 'default' => 'Alert triggered'],
            ['key' => 'webhook_url', 'label' => 'Webhook URL', 'type' => 'string'],
            ['key' => 'message', 'label' => 'Message', 'type' => 'textarea', 'required' => true, 'default' => 'An alert condition was triggered.'],
        ];
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $input = $inputValues[0] ?? null;
        if (!$input) {
            return NodeResult::noPropagate(null, $state);
        }
        return NodeResult::propagate(true, ['action_dispatched' => true]);
    }
}
