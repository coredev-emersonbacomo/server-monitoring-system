<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ServerLogData extends Data
{
    public function __construct(
        //
        public string $id,
        public string $server_id,
        public string $log_content,
        public \DateTimeImmutable $timestamp,

    ) {}
}
