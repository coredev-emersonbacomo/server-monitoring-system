<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Confirmed;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\Unique;
use Spatie\LaravelData\Data;

class RegisterData extends Data
{
    public function __construct(
        #[Required, Min(2), Max(255)]
        public string $name,

        #[Required, Email, Unique('users', 'email')]
        public string $email,

        #[Required, Min(8), Max(255), Confirmed]
        public string $password,
    ) {}
}
