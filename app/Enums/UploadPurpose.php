<?php

namespace App\Enums;

enum UploadPurpose: string
{
    case PROFILE_PICTURE = 'profile_picture';
    case CLIENT_BANNER = 'client_banner';
    case ATTACHMENT = 'attachment';
    case DOCUMENT = 'document';

    public function label(): string
    {
        return match ($this) {
            self::PROFILE_PICTURE => 'Profile Picture',
            self::CLIENT_BANNER => 'Client Banner',
            self::ATTACHMENT => 'Attachment',
            self::DOCUMENT => 'Document',
        };
    }

    public static function values(): array
    {
        return array_map(fn(self $case) => $case->value, self::cases());
    }
}
