<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class UploadSignatureData extends Data
{
    public function __construct(
        public string $cloud_name,
        public string $api_key,
        public int $timestamp,
        public string $folder,
        public string $signature,
    ) {}
}
