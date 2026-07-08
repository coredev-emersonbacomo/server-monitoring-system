<?php

namespace App\Data;

use App\Enums\TimeUnits;
use Carbon\Carbon;
use Spatie\LaravelData\Data;

class ServerDataRequest extends Data
{
    public function __construct(
        public readonly Carbon $startFrom,
        public readonly TimeUnits $unit
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            // Carbon safely parses strings like "2026-07-07" or "-2 hours"
            startFrom: Carbon::parse($data['time_subtract']),
            unit: TimeUnits::from($data['time_unit'])
        );
    }

    public function getTableUnits(): string
    {
        return match($this->unit) {
            TimeUnits::Minute => 'server_updates_agg_minute',
            TimeUnits::Hour   => 'server_updates_agg_hour',
            TimeUnits::Day    => 'server_updates_agg_day',
            TimeUnits::Week   => 'server_updates_agg_week',
            TimeUnits::Month  => 'server_updates_agg_month',
        };
    }
}
