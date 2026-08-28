<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\In;
use Spatie\LaravelData\Data;

class ActivityLogsQuery extends Data
{
    public function __construct(
        #[In(5, 10, 15, 25, 50, 100)]
        public ?int $per_page = null,
        public ?string $search = null,
        public ?string $action = null,
        public ?string $user = null,
        public ?string $server_uuid = null,
        public ?string $start_date = null,
        public ?string $end_date = null,
        #[In('created_at', 'action', 'user', 'logable_type')]
        public ?string $sort_field = null,
        #[In('asc', 'desc')]
        public ?string $sort_dir = null,
    ) {}
}
