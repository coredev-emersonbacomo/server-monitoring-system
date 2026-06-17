<?php

namespace App\Data;

use Spatie\LaravelData\Data;

class ClientData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public string $description,
        public string $location,
        public string $email,
        public string $contact_number,
        public string $banner_image_url,
        public int $servers_count,
        public string $created_at,
        public string $updated_at,
    ) {}
}
