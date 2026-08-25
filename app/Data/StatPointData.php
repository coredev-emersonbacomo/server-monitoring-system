<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class StatPointData extends Data
{
    public function __construct(
        public int $timestamp,
        public float $cpu,
        public float $memory,
        public float $netIn,
        public float $netOut,
        public float $disk,
        /** @var array<int, array{name: string, netIn: float, netOut: float}> Per-interface MB/s rates; empty when no per-interface data exists for this point. */
        public array $networks = [],
    ) {}
}
