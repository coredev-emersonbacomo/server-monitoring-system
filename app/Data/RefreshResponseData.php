<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class RefreshResponseData extends Data
{
    public function __construct(
        public string $access_token,
        public int $expires_in,
        public string $session_uuid,
    ) {}
}
