<?php

namespace App\Enums;

enum Severity: string
{
    case Notice = 'notice';
    case Warning = 'warning';
    case Critical = 'critical';

    public function label(): string
    {
        return match ($this) {
            self::Notice => 'Notice',
            self::Warning => 'Warning',
            self::Critical => 'Critical',
        };
    }

    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    public static function options(): array
    {
        $opts = [];
        foreach (self::cases() as $case) {
            $opts[$case->value] = $case->label();
        }

        return $opts;
    }
}
