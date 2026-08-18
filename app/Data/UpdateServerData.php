<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Numeric;

class UpdateServerData extends Data
{
    public function __construct(
        #[Required, StringType, Max(64)]
        public string $name,
        #[StringType, Max(512)]
        public ?string $description = null,
        public string|Optional|null $alert_scope = null,
        #[Numeric, Min(0)]
        public float|Optional|null $subscription_fee = null,
    ) {}
}
