<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\In;
use Spatie\LaravelData\Data;

class ClientsIndexData extends Data
{
    public function __construct(
        public ?string $user_uuid = null,
        public ?string $exclude_user_uuid = null,
        #[In('true', 'false', '0', '1', true, false, 0, 1)]
        public mixed $available_only = false,
        public ?string $q = null,
        public ?string $filter = 'all',
        public ?string $sort = 'name',
        #[In('asc', 'desc')]
        public ?string $dir = 'asc',
        public int $page = 1,
        public int $per_page = 15,
    ) {}

    public function isAvailableOnly(): bool
    {
        return filter_var($this->available_only, FILTER_VALIDATE_BOOLEAN);
    }
}
