<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\In;
use Spatie\LaravelData\Data;

class ServersIndexData extends Data
{
    public function __construct(
        public ?string $client_uuid = null,
        public ?string $q = null,
        public ?string $status = 'all',
        public ?string $sort = 'created_at',
        #[In('asc', 'desc')]
        public ?string $dir = 'desc',
        public int $page = 1,
        public int $per_page = 15,
    ) {}
}
