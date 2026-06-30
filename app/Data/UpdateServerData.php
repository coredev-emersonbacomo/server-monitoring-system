<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class UpdateServerData extends Data
{
    public function __construct(
        public ?string $server_name = null,
        public ?string $device_name = null,
        public ?string $internal_ip = null,
        public ?string $external_ip = null,
        public ?string $ssh_username = null,
        public ?string $ssh_password = null,
    ) {}
}
