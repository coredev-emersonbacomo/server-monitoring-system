<?php

namespace App\Enums;

enum UploadIntentStatus: string
{
    case PENDING = 'pending';
    case ATTACHED = 'attached';
    case EXPIRED = 'expired';
    case DELETED = 'deleted';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::ATTACHED => 'Attached',
            self::EXPIRED => 'Expired',
            self::DELETED => 'Deleted',
        };
    }

    public static function values(): array
    {
        return array_map(fn(self $case) => $case->value, self::cases());
    }
}
