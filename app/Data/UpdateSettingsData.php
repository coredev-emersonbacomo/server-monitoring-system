<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Between;
use Spatie\LaravelData\Attributes\Validation\IntegerType;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Data;

class UpdateSettingsData extends Data
{
    public function __construct(
        #[IntegerType, Between(1, 50)]
        public ?int $secop_limit_per_client = null,
        #[IntegerType, Between(1, 1000)]
        public ?int $heartbeat_interval = null,
        #[IntegerType, Between(1, 3600)]
        public ?int $offline_threshold = null,
        #[IntegerType, Between(1, 3600)]
        public ?int $port_ping_interval = null,
        #[IntegerType, Between(1, 3650)]
        public ?int $agent_log_retention_days = null,
        #[StringType]
        public ?string $agent_version = null,
    ) {}
}
