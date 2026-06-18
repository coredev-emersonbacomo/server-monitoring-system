<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ServerData extends Data
{
    public function __construct(
        public int $id,
        public string $server_name,
        public string $device_name,
        public string $internal_ip,
        public string $external_ip,
        public ?int $cpu_cores,
        public ?int $ram,
        public ?string $operating_system,
        public int $client_id,
        public string $client_name,
        /** @var array<int, array<string, mixed>> */
        public array $stats,
    ) {}
}
