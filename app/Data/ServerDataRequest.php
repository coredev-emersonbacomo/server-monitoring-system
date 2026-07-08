<?php

namespace App\Data;

use App\Enums\TimeUnits;
use Carbon\Carbon;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

class ServerDataRequest extends Data
{
    public function __construct(
        #[MapInputName('time_subtract')]
        public readonly string $timeSubtract, // Keep as string here

        #[MapInputName('time_unit')]
        public readonly TimeUnits $unit
    ) {}

    // Expose a helper to fetch the processed Carbon instance on demand
    public function getStartFromDatetime(): Carbon
    {
        return Carbon::parse($this->timeSubtract ?? '-1 hour');
    }

    public function getTableUnits(): string
    {
        return match ($this->unit) {
            TimeUnits::Minute => 'server_updates_agg_minute',
            TimeUnits::Hour   => 'server_updates_agg_hour',
            TimeUnits::Day    => 'server_updates_agg_day',
            TimeUnits::Week   => 'server_updates_agg_week',
            TimeUnits::Month  => 'server_updates_agg_month',
        };
    }
}
