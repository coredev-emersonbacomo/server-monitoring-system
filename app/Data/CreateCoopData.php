<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Illuminate\Http\UploadedFile;

class CreateCoopData extends Data
{
    public function __construct(

        #[Required, Min(2), Max(255)]
        public string $name,
        #[Min(5)]
        public string $description,
        #[Required, Min(5)]
        public string $location,
        #[Required, Min(5), Max(255)]
        public string $email,
        #[Required, Min(5)]
        public string $contact_number,
        public ?UploadedFile $banner_image = null,
    ) {}
}
