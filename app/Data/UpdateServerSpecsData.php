<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\MapInputName;

class UpdateServerSpecsData extends Data
{
    public function __construct(
        public string $uuid,

        public string $token,

        #[MapInputName('cpu.model')]
        public string $cpu_model,

        #[MapInputName('cpu.cores')]
        public int $cpu_cores,

        #[MapInputName('memory')]
        public string $ram,

        public int $disk,

        public string $operating_system,
    ) {}
}
