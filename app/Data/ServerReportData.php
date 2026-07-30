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
        public string $record_status,
        public ?string $last_seen,

        /** @var Collection<ServerMetricPointData> */
        public Collection $metrics,

        public ServerUptimeData $uptime,

        public float $running_balance,
        public float $net_cost,
        public float $accumulated_cost,
        public ?string $billing_date,

        /** @var array{type: string, description: string, created_at: string}[] */
        public array $activities,
    ) {
    }
}