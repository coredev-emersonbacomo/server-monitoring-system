<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Numeric;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Data;

use Spatie\LaravelData\Attributes\Validation\Min;

class CreateServerData extends Data
{
    public function __construct(
        #[Required, StringType, Max(255)]
        public string $name,

        #[StringType, Max(512)]
        public ?string $description = null,

        #[Numeric, Min(0)]
        public ?float $subscription_fee = 0.00,
    ) {}
}
