<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ServerMetricPointData extends Data
{
    public function __construct(
        public string $timestamp,
        public $cpu_usage,
        public float $memory_usage,
        public float $disk_usage,
        public int $network_rbytes,
        public int $network_tbytes,
    ) {}
}
