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

        #[Required]
        public int $id,
        #[Required, Min(2), Max(255)]
        public string $name,
        #[StringType,Nullable, Min(5)]
        public string $description,
        #[Required,StringType,Min(5)]
        public string $location,
        #[Required, Email,Min(5), Max(255)]
        public string $email,
        #[Required,StringType,Min(5)]
        public string $contact_number,
        #[MimeTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']), Max(4096)]
        public ?string $banner_image_path = null,
        public string $banner_image_url,
        public int $servers_count,
        public string $created_at,
        public string $updated_at,
    ) {}
}
