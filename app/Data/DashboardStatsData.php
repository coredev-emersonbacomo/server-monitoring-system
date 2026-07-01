<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class DashboardStatsData extends Data
{
    public function __construct(
        public int $total_clients,
        public int $total_servers,
        public int $online_count,
        public int $warning_count,
        public int $offline_count,
        /** @var array<int, array{server_uuid: string, server_name: string, client_name: string, value: float}> */
        public array $top_usage_cpu,
        /** @var array<int, array{server_uuid: string, server_name: string, client_name: string, value: float}> */
        public array $top_usage_memory,
        /** @var array<int, array{server_uuid: string, server_name: string, client_name: string, value: float}> */
        public array $top_usage_disk,
    ) {}
}
