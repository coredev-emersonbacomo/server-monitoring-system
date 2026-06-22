<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class CloudinaryUploadMetadata extends Data
{
    public function __construct(
        public string $public_id,
        public string $secure_url,
        public int $width,
        public int $height,
        public string $format,
        public int $bytes,
    ) {}
}
