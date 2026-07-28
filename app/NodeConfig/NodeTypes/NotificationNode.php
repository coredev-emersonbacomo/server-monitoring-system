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
            ['key' => 'channel', 'label' => 'Channel', 'type' => 'select', 'required' => true, 'default' => 'email', 'options' => [
                'email' => 'Email',
                'sms' => 'SMS',
                'discord' => 'Discord',
            ]],
            ['key' => 'subject', 'label' => 'Subject', 'type' => 'string', 'default' => 'Alert triggered'],
            ['key' => 'bot_token', 'label' => 'Bot Token', 'type' => 'string', 'description' => 'Discord bot token'],
            ['key' => 'channel_id', 'label' => 'Channel ID', 'type' => 'string', 'description' => 'Discord channel ID'],
            ['key' => 'role_id', 'label' => 'Role ID', 'type' => 'string', 'description' => 'Discord role ID to mention (optional)'],
            ['key' => 'message', 'label' => 'Message', 'type' => 'textarea', 'required' => true, 'default' => 'An alert condition was triggered.'],
        ];
    }

    public function hasOutput(): bool
    {
        return false;
    }

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $input = $inputValues[0] ?? null;

        if ($input === null || !$input) {
            return NodeResult::noPropagate(null, []);
        }

        return NodeResult::propagate(true, ['action_dispatched' => true]);
    }
}
