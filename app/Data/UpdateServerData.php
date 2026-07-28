<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

class UpdateServerData extends Data
{
    public function __construct(
        #[Required, StringType, Max(255)]
        public string $name,
        #[StringType, Max(512)]
        public ?string $description = null,
        public string|Optional|null $alert_scope = null,
        public float|Optional|null $monthly_cost = null,
    ) {}
}
