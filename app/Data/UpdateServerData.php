<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class UpdateServerData extends Data
{
    public function __construct(
        public ?string $server_name = null,
        public ?string $host_name = null,
        public ?string $external_ip = null,
    ) {}
}
