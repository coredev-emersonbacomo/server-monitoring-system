<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Exists;
use Spatie\LaravelData\Attributes\Validation\IntegerType;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;

class AddSecopData extends Data
{
    public function __construct(
        #[Required, IntegerType, Exists('users', 'id')]
        public int $user_id,
    ) {}
}
