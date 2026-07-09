<?php

namespace App\NodeConfig\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Attributes\Validation\BooleanType;
use Spatie\LaravelData\Optional;

class NodeConfigRequestData extends Data
{
    public function __construct(
        #[Required, StringType]
        public string $name,
        public Optional|string|null $description,
        #[Required]
        public NodeConfigData $config,
        public Optional|bool $enabled,
    ) {}
}
