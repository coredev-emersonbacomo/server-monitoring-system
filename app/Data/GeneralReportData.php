<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class GeneralReportData extends Data
{
    public function __construct(
        public string $report_title,
        public string $report_subtitle,
        public int $total_servers,
        public int $total_clients,
        public int $total_users,
        public int $online_servers,
        public int $offline_servers,
        public int $total_alerts,
        public int $critical_alerts,
        public int $warning_alerts,
        public int $unassigned_servers,
        public float $avg_uptime_percentage,
        public float $avg_cpu_usage,
        public float $avg_memory_usage,
        public float $avg_disk_usage,

        /** @var GeneralServerSummaryData[] */
        public array $need_attention_servers,

        /** @var GeneralServerSummaryData[] */
        public array $sla_servers,

        /** @var array<int, array{client_name: string, server_count: int, active_alerts: int}> */
        public array $servers_per_client,

        /** @var array<int, array{name: string, email: string, phone: string, created_at: string}> */
        public array $recent_clients,

        /** @var array<int, array{name: string, assigned_client: string, hostname: string, created_at: string}> */
        public array $recent_servers,
    ) {}
}
