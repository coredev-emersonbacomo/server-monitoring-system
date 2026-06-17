<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\IPv4;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Required;

class ServerData extends Data
{
    public function __construct(
        #[Required]
        public int $id,

        #[Required]
        public int $client_id,

        #[Required, Max(100)]
        public string $server_name,

        #[Required, Max(100)]
        public string $device_name,

        // IPv4
        #[Required, IPv4]
        public int $internal_ip,

        #[Required, IPv4]
        public int $external_ip,
    ) {}
}
