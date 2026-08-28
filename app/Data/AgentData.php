<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class AgentData extends Data
{
    public function __construct(
        public string $version,
        public string $status,
        public string $registered_at,
        public ?string $last_seen_at,
        public int $heartbeat_interval,
        public int $metrics_interval,
        public int $port_scan_interval,
        public int $service_scan_interval,
        public int $process_scan_interval,
        public string $update_channel,
        public bool $auto_update,
        public bool $is_alive,
    ) {}
}
