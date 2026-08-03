<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ClientReportData extends Data
{
    public function __construct(
        public string $uuid,
        public string $name,
        public string $email,
        public string $location,
        public ?string $contact,
        public int $total_servers,
        public int $online_servers,
        public int $offline_servers,
        public ?float $avg_cpu_usage,
        public ?float $avg_memory_usage,
        public int $total_alerts,

        /** @var ClientServerSummaryData[] */
        public array $servers,
    ) {}
}
