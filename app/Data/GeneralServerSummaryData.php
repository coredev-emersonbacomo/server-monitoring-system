<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class GeneralServerSummaryData extends Data
{
    public function __construct(
        public string $uuid,
        public string $name,
        public string $client_name,
        public string $status,
        public float $cpu_usage,
        public float $memory_usage,
        public float $uptime_percentage,
        public float $uptime_hours,
        public int $range_hours,
    ) {}
}
