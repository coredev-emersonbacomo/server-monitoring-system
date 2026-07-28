<?php

namespace App\NodeConfig\NodeTypes;

abstract class BaseNode implements NodeType
{
    public function acceptsUnlimitedInputs(): bool
    {
        return false;
    }

    public function hasOutput(): bool
    {
        return true;
    }

    public function getSettingDefinitions(): array
    {
        return [];
    }

    /**
     * Parse a duration value (already stored as ms string from the frontend)
     * into an integer milliseconds.
     */
    public static function parseDurationToMs(string $duration): int
    {
        return (int) $duration;
    }
}
