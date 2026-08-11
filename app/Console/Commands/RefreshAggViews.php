<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RefreshAggViews extends Command
{
    protected $signature = 'agg:refresh';

    protected $description = 'Refresh all server_updates materialized aggregate views';

    private const VIEWS = [
        'server_updates_agg_minute',
        'server_updates_agg_hour',
        'server_updates_agg_day',
        'server_updates_agg_week',
        'server_updates_agg_month',
    ];

    public function handle(): int
    {
        foreach (self::VIEWS as $view) {
            $isContinuousAgg = !empty(DB::select(
                "SELECT view_name FROM timescaledb_information.continuous_aggregates WHERE view_name = ?",
                [$view],
            ));

            if ($isContinuousAgg) {
                DB::statement("SELECT refresh_continuous_aggregate('{$view}', NULL, NULL)");
                continue;
            }

            $populated = DB::select(
                "SELECT relispopulated FROM pg_class WHERE relname = ?",
                [$view]
            );

            $isPopulated = !empty($populated) && $populated[0]->relispopulated;

            if ($isPopulated) {
                DB::statement("REFRESH MATERIALIZED VIEW CONCURRENTLY {$view}");
            } else {
                DB::statement("REFRESH MATERIALIZED VIEW {$view}");
            }
        }

        $this->info('Refreshed all aggregate views.');
        return self::SUCCESS;
    }
}
