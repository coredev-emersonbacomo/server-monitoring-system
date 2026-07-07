<?php

namespace App\Data;

use App\Enums\TimeUnits;
use Carbon\Carbon;
use Spatie\LaravelData\Data;

class ServerDataRequest extends Data
{
    public function __construct(
        public readonly int $serverId,
        public readonly Carbon $startFrom,
        public readonly TimeUnits $unit
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            serverId: (int) $data['server_id'],
            // Carbon safely parses strings like "2026-07-07" or "-2 hours"
            startFrom: Carbon::parse($data['time_subtract']),
            unit: TimeUnits::from($data['time_unit'])
        );
    }
}
