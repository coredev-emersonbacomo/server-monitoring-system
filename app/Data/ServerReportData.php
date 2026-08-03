<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Illuminate\Support\Collection;

class ServerReportData extends Data
{
    public function __construct(
        public string $uuid,
        public string $name,
        public ?string $description,
        public ?string $client_name,
        public ?string $host_name,
        public ?string $cpu_model,
        public ?int $cpu_cores,
        public ?string $ram,
        public ?string $disk,
        public ?string $operating_system,
        public string $status,

        /** @var Collection<ServerMetricPointData> */
        public Collection $metrics,

        public ServerUptimeData $uptime,

        public string $record_status = 'active',
        public ?string $last_seen = null,
        public float $running_balance = 0.0,
        public float $net_cost = 0.0,
        public float $accumulated_cost = 0.0,
        public ?string $billing_date = null,

        /** @var array{type: string, description: string, created_at: string}[] */
        public array $activities = [],

        /** @var float[] */
        public array $cpu_7d = [],
        /** @var float[] */
        public array $memory_7d = [],
        /** @var float[] */
        public array $disk_7d = [],
    ) {
    }
}
