<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ClientsIndexData extends Data
{
    public function __construct(
        public ?string $user_uuid = null,
        public ?string $exclude_user_uuid = null,
        public bool $available_only = false,
    ) {}
}