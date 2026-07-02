<?php

namespace App\Enums;

enum ServerHealth: string
{
    case Online = 'online';
    case Warning = 'warning';
    case Offline = 'offline';

    public function label(): string
    {
        return match ($this) {
            self::Online => 'Online',
            self::Warning => 'Warning',
            self::Offline => 'Offline',
        };
    }

    public static function values(): array
    {
        return array_map(fn(self $case) => $case->value, self::cases());
    }
}
