<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class UploadIntentData extends Data
{
    public function __construct(
        public string $intent_id,
        public string $storage_key,
        public string $provider,
        public array $upload_config,
        public string $expires_at,
    ) {}
}
