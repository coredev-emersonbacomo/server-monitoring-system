<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\IPv4;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;

class CreateServerData extends Data
{
    public function __construct(
        #[Required]
        public string $server_name,

        public ?string $device_name = null,

        #[Required, IPv4]
        public string $internal_ip,

        public ?string $external_ip = null,

        public ?string $ssh_username = null,

        public ?string $ssh_password = null,

        public ?int $cpu_cores = null,

        public ?int $ram = null,

        public ?string $operating_system = null,
    ) {}
}
