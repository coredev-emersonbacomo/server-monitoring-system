<?php

namespace App\NodeConfig\Data;

use Spatie\LaravelData\Attributes\Validation\ArrayType;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;

class NodeConfigData extends Data
{
    public function __construct(
        #[Required, ArrayType]
        public array $nodes,
        #[Required, ArrayType]
        public array $edges,
    ) {}
}
