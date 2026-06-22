<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\MimeTypes;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\Nullable;
use Spatie\LaravelData\Attributes\Validation\StringType;

class ClientData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public string $description,
        public string $location,
        public string $email,
        public string $contact_number,
        public ?string $banner_image_path = null,
        public string $banner_image_url,
        public ?string $banner_image_public_id = null,
        public int $servers_count,
        public string $created_at,
        public string $updated_at,
    ) {}
}
