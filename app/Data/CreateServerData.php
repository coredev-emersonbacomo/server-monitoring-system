<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class CreateServerData extends Data
{
    public function __construct(
        public string $server_name,
        public string $device_name,
        public string $internal_ip,
        public string $external_ip,
        public ?int $cpu_cores,
        public ?int $ram,
        public ?string $operating_system,
    ) {}
}
