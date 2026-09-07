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
            // cagg = real Timescale continuous aggregate, CALL refresh.
            // mat view = REFRESH MATERIALIZED VIEW [CONCURRENTLY].
            // plain view = a view created as a placeholder (no data, just
            //     exists for the API layer). Skip — no refresh possible.
            $kind = DB::selectOne(
                "SELECT c.relkind,
                        CASE WHEN c.relkind = 'm' THEN pg_get_viewdef(c.oid) END AS viewdef
                   FROM pg_class c
                   WHERE c.relname = ?",
                [$view]
            );

            if (! $kind) {
                $this->warn("Skipping {$view}: not found. Database schema is missing the timescale aggregates (resetdb or run the timescale migration to recreate).");

                continue;
            }

            if ($kind->relkind === 'p' /* partitioned table, also used for hypertables */) {
                $isCagg = ! empty(DB::select(
                    'SELECT 1 FROM timescaledb_information.continuous_aggregates WHERE view_name = ?',
                    [$view]
                ));
                if ($isCagg) {
                    DB::statement("CALL refresh_continuous_aggregate('{$view}', NULL, NULL)");
                } else {
                    $this->warn("Skipping {$view}: underlying table is a hypertable but no continuous aggregate is defined.");
                }

                continue;
            }

            if ($kind->relkind === 'm' /* mat view */) {
                $isPopulated = ! empty(DB::select(
                    'SELECT relispopulated FROM pg_class WHERE relname = ?',
                    [$view]
                )) && DB::selectOne('SELECT relispopulated FROM pg_class WHERE relname = ?', [$view])->relispopulated;
                if ($isPopulated) {
                    DB::statement("REFRESH MATERIALIZED VIEW CONCURRENTLY {$view}");
                } else {
                    DB::statement("REFRESH MATERIALIZED VIEW {$view}");
                }

                continue;
            }

            // relkind = 'v' (plain view) or anything else: nothing to refresh.
            $this->warn("Skipping {$view}: plain view (relkind={$kind->relkind}), no aggregate to refresh.");
        }

        $this->info('Refreshed all aggregate views.');

        return self::SUCCESS;
    }
}
