<?php

namespace App\NodeConfig\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\ArrayType;

class NodeConfigData extends Data
{
    public function __construct(
        #[Required, ArrayType]
        public array $nodes,
        #[Required, ArrayType]
        public array $edges,
    ) {}
}
