<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Exists;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;

class AddClientData extends Data
{
    public function __construct(
        #[Required, Exists('clients', 'uuid')]
        public string $client_uuid,
    ) {}
}
