<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Exists;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;

class AddSecopData extends Data
{
    public function __construct(
        #[Required, Exists('users', 'uuid')]
        public string $user_uuid,
    ) {}
}
