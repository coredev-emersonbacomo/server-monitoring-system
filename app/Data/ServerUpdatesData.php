<?php

namespace App\Data;

use Brick\Math\BigInteger;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;

class ServerUpdatesData extends Data
{
    public function __construct(
        #[Required]
        public int $server_id,

        #[Required, Min(0), Max(100)]
        public float $cpu_usage,

        #[Required, Min(0), Max(100)]
        public float $memory_usage,

        #[Required, Min(0)]
        public float $storage,

        #[Required, Min(0)]
        public BigInteger $uptime,

        #[Required, Min(0)]
        public BigInteger $network_rbytes,

        #[Required, Min(0)]
        public BigInteger $network_tbytes
    ) {}
}
