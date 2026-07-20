<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ProvisionDetailData extends Data
{
    public function __construct(
        public string $expires_at,
        public bool $conflict = false,
        public ?string $token = null,
        public ?string $linux_command = null,
        public ?string $windows_command = null,
        public ?string $generated_at = null,
        public ?int $remaining_seconds = null,
        public ?string $token_expires_in = null,
    ) {}
}
