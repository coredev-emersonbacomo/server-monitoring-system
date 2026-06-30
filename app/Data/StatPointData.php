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
    ) {}
}
