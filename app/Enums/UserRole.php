<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'Admin';
    case User = 'User';
    case SecOps = 'SecOps';

    public function id(): int
    {
        return match ($this) {
            self::Admin => 1,
            self::User => 2,
            self::SecOps => 3,
        };
    }
}
