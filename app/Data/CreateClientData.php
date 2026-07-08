<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\Unique;
use Illuminate\Http\UploadedFile;

class CreateClientData extends Data
{
    public function __construct(
        #[Required, Min(2), Max(255)]
        public string $name,

        #[Required, Min(5)]
        public string $location,

        #[Required, Min(5), Max(255), Unique('clients', 'email')]
        public string $email,

        #[Required, Min(5)]
        public string $contact_number,

        #[Required, Min(5), Max(255)]
        public ?string $description = null,

        public ?UploadedFile $banner_image = null,

        public ?string $upload_intent_id = null,

        public ?string $banner_image_storage_key = null,
    ) {}
}
