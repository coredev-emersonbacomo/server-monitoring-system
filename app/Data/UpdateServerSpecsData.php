<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class UpdateServerSpecsData extends Data
{
    public function __construct(
        public string $uuid,

        public string $cpu_model,

        public int $cpu_cores,

        public int $ram,

        public string $operating_system,
    ) {}
}
