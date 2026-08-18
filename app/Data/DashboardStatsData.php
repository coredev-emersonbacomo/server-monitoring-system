<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class DashboardStatsData extends Data
{
    public function __construct(
        public int $total_users,
        public int $total_clients,
        public int $total_servers,
        public int $online_count,
        public int $offline_count,
        public int $pending_installation_count = 0,
        public int $waiting_for_installation_count = 0,
        public int $pending_deletion_count = 0,
        /** @var array<int, array{server_uuid: string, name: string, client_name: string, value: float}> */
        public array $top_usage_cpu,
        /** @var array<int, array{server_uuid: string, name: string, client_name: string, value: float}> */
        public array $top_usage_memory,
        /** @var array<int, array{server_uuid: string, name: string, client_name: string, value: float}> */
        public array $top_usage_disk,
    ) {}
}

