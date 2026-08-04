<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ClientServerSummaryData extends Data
{
    public function __construct(
        public string $uuid,
        public string $name,
        public string $status,
        public ?string $cpu_model,
        public ?int $cpu_cores,
        public ?string $ram,
        public ?string $disk,
        public ?float $disk_used_gb,
        public ?float $cpu_usage,
        public ?float $memory_usage,
        public ?float $disk_usage,
        public ?string $last_seen,
        public float $uptime_percentage,
    ) {}
}
