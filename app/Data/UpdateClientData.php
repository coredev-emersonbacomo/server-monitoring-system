<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\Sometimes;
use Spatie\LaravelData\Optional;

class UpdateClientData extends Data
{
    public function __construct(
        #[Required, Min(2), Max(255)]
        public string $name,

        #[Required, Min(5)]
        public string $location,

        #[Required, Min(5), Max(255)]
        public string $email,

        #[Required, Min(5)]
        public string $contact_number,

        #[Min(5), Max(255), Sometimes]
        public string|Optional $description,

        public string|Optional|null $upload_intent_id,

        public string|Optional|null $banner_image_storage_key,
    ) {}
}
