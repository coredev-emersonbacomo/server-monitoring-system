<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Between;
use Spatie\LaravelData\Attributes\Validation\IPv4;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Numeric;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Data;

class CreateServerData extends Data
{
    public function __construct(
        #[Required, StringType, Max(255)]
        public string $server_name,

        #[Required, IPv4]
        public string $external_ip,

        #[Required, Numeric, Between(1, 65535)]
        public int $ssh_port,

        #[Required, StringType]
        public string $ssh_username,

        #[Required, StringType]
        public string $ssh_password,

        public ?string $device_name = null,

        public ?int $cpu_cores = null,

        public ?int $ram = null,

        public ?string $operating_system = null,
    ) {}
}
