<?php
namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Confirmed;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\Unique;

use Spatie\LaravelData\Data;
//  CreateUserData.php 

class CreateUserData extends Data
{
    public function __construct(
        #[Required, Max(255)]
        public string $first_name,

        #[Required, Max(255)]
        public string $last_name,

        #[Required,Email, Max(255), Unique('users', 'email')]
        public string $email,
        
        #[Required,Min(11),Max(255), Unique('users', 'contact_number')]
        public string $contact_number,

        #[Required, Max(255), Unique('users', 'username')]
        public string $username,

        #[Required]
        public int $role_id,

        #[Required, Min(8), Confirmed]
        public string $password,

        public string $password_confirmation,
    ) {}
}
