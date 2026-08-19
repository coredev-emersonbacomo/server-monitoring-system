<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

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

        public string $disk,

        public string $operating_system,
    ) {}
}
