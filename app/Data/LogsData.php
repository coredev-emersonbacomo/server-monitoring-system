<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class LogsData extends Data
{
    public function __construct(
        public int $user_id,
        public string $user_firstname,
        public string $user_lastname,
        public string $action,
        public \DateTimeImmutable $timestamp,
    ) {}
}
