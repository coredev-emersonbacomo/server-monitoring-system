<?php

namespace App\Enums;

enum ServerStatus: string
{
    case PendingInstallation = 'pending_installation';
    case WaitingForInstallation = 'waiting_for_installation';
    case WaitingForFirstHeartbeat = 'waiting_for_first_heartbeat';
    case Online = 'online';
    case Offline = 'offline';
    case Archived = 'archived';
    case AgentUninstalled = 'agent_uninstalled';

    public function label(): string
    {
        return match ($this) {
            self::PendingInstallation => 'Pending Installation',
            self::WaitingForInstallation => 'Waiting For Installation',
            self::WaitingForFirstHeartbeat => 'Waiting For First Heartbeat',
            self::Online => 'Online',
            self::Offline => 'Offline',
            self::Archived => 'Archived',
            self::AgentUninstalled => 'Agent Uninstalled',
        };
    }

    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
