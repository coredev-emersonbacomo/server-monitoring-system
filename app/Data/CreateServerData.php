<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Required;

class CreateServerData extends Data

{
    public function __construct(
        #[Required]
        public string $server_name,
        #[Required]
        public string $device_name,
        #[Required]
        public string $internal_ip,
        #[Required]
        public string $external_ip,
        #[Required]
        public int $cpu_cores,
        #[Required]
        public int $ram,
        #[Required]
        public string $operating_system
    ) {}
}
