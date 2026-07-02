<?php

namespace App\Enums;

enum RecordStatus: string
{
    case Active = 'active';
    case Online = 'online';
    case Offline = 'offline';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Online => 'Online',
            self::Offline => 'Offline',
        };
    }

    public static function values(): array
    {
        return array_map(fn(self $case) => $case->value, self::cases());
    }
}
