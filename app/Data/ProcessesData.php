<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ProcessesData extends Data
{
    public function __construct(
        public int $pid,
        public string $name,
        public ?float $cpu,
        public ?float $memory,
        public ?string $last_seen = null,
        /** @var int[]|null Grouped process pids (count = the instance count). */
        public ?array $pids = null,
    ) {}
}
