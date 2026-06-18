<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\StringType;
class LocalAlertData extends Data
{
    public function __construct(
        #[Required]
        public int $server_id,
         #[Required,StringType]
        public string $metric,
        #[Required, Min(0), Max(100)]
        public int $threshold,
        #[Required,StringType]
        public string $notification_channel
    ) {}
}
