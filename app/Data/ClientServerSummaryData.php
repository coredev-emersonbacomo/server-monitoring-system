<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ClientServerSummaryData extends Data
{
    public function __construct(
        public string $uuid,
        public string $name,
        public string $status,
        public ?float $cpu_usage,
        public ?float $memory_usage,
        public ?float $disk_usage,
        public ?string $last_seen,
        public float $uptime_percentage,
    ) {}
}
