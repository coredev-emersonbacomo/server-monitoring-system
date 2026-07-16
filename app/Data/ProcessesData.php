<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ProcessesData extends Data
{
    /** @var array{pid: int, name: string, cpu: float|null, memory: float|null}[]|null */
    public function __construct(
        public int $timestamp,
        public int $pid,
        public string $name,
        public ?float $cpu,
        public ?float $memory,
    ) {}
}
