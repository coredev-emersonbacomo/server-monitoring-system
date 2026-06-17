<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Required;

class ServerData extends Data
{
    public function __construct(
        #[Required]
        public string $cpu_usage,
        #[Required]
        public string $memory_usage,
        #[Required]
        public string $storage,
        #[Required] 
        public int $uptime,
        #[Required]
        public int $network_rbytes,
        #[Required]
        public int $network_tbytes
    ) {}
}
