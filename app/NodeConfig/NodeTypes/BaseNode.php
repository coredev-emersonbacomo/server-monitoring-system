<?php

namespace App\NodeConfig\NodeTypes;

abstract class BaseNode implements NodeType
{
    public function acceptsUnlimitedInputs(): bool
    {
        return false;
    }

    public function getSettingDefinitions(): array
    {
        return [];
    }

    public static function parseDurationToSeconds(string $duration): int
    {
        $parts = explode(':', $duration);
        $parts = array_pad(array_slice($parts, 0, 5), 5, '0');
        [$months, $days, $hours, $minutes, $seconds] = array_map('intval', $parts);

        return ($months * 30 * 86400) + ($days * 86400) + ($hours * 3600) + ($minutes * 60) + $seconds;
    }
}
