<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class PortsData extends Data
{
    public function __construct(
        public int $id,
        public int $port,
        public string $protocol,
        public string $state,
        public ?string $process,
        public ?string $ping_status,
        public ?int $ping_time,
    ) {}
}
