<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\IPv4;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Size;
use Spatie\LaravelData\Data;
use Symfony\Contracts\Service\Attribute\Required;

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
        #[Required, IPv4]
        public string $internal_ip,
        #[Required, IPv4]
        public string $external_ip,

        public ?int $cpu_cores,
        public ?int $ram,
        public ?string $operating_system,

        public string $client_name,
        /** @var array<int, array<string, mixed>> */
        // Pre-existing/latest stats
        public array $stats,
    ) {}
}
