<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Data;

class GlobalAlertData extends Data
{
    public function __construct(
        #[Required, StringType]
        public string $metric,
        #[Required, Min(0), Max(100)]
        public int $threshold,
        #[Required, StringType]
        public string $notification_channel
    ) {}
}
