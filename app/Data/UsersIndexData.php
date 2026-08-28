<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\In;
use Spatie\LaravelData\Data;

class UsersIndexData extends Data
{
    public function __construct(
        public ?string $q = null,
        public ?string $filter = 'all',
        public ?string $sort = 'created_at',
        #[In('asc', 'desc')]
        public ?string $dir = 'desc',
        public ?string $exclude_user_uuid = null,
        public int $page = 1,
        public int $per_page = 15,
    ) {}
}
