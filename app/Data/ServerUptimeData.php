<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ServerUptimeData extends Data
{
    public function __construct(
        public int $uptime_seconds,
        public float $uptime_percentage,
        public int $outage_count,
        public ?string $last_downtime,
    ) {
    }
}