<?php

namespace App\Data;

use App\Enums\TimeUnits;
use Illuminate\Support\Carbon;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Data;

class ServerDataRequest extends Data
{
    public function __construct(
        #[MapInputName('time_unit')]
        public readonly TimeUnits $unit,

        #[MapInputName('time_subtract')]
        public readonly ?string $timeSubtract = null,

        #[MapInputName('from_time')]
        public readonly ?string $fromTime = null,

        #[MapInputName('to_time')]
        public readonly ?string $toTime = null,
    ) {}

    // Expose a helper to fetch the processed Carbon instance on demand
    public function getStartFromDatetime(): Carbon
    {
        if ($this->fromTime) {
            return Carbon::parse($this->fromTime);
        }
        return Carbon::parse($this->timeSubtract ?? '-1 hour');
    }

    public function getEndToDatetime(): ?Carbon
    {
        if ($this->toTime) {
            return Carbon::parse($this->toTime);
        }
        return null;
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
