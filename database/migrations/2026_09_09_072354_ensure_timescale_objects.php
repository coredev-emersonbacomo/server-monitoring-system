<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Tpetry\PostgresqlEnhanced\Support\Facades\Schema;

/**
 * Repair migration: databases built from the schema dump (fresh Docker
 * `migrate`/`resetdb`) silently miss TimescaleDB objects — pg_dump restores
 * plain tables/views, and the original CREATE migrations are marked as run.
 * Result: 0 hypertables, 0 continuous aggregates, and 500s wherever
 * queryAggTable runs. This migration recreates everything idempotently, so
 * it also heals already-broken databases on next deploy. Healthy databases
 * are untouched (every statement is existence-guarded).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::createExtensionIfNotExists('timescaledb');

        DB::unprepared("SELECT create_hypertable('server_updates', 'created_at', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE)");
        DB::unprepared("SELECT create_hypertable('server_network_stats', 'created_at', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE)");

        foreach (self::caggs() as $name => $def) {
            $realtime = $def['realtime'] ? ', timescaledb.materialized_only=false' : '';
            // Dollar-quoting needs unique tags per statement inside unprepared().
            DB::unprepared(<<<SQL
                DO \$cagg_{$name}\$
                BEGIN
                    IF to_regclass('public.{$name}') IS NULL THEN
                        CREATE MATERIALIZED VIEW public.{$name}
                        WITH (timescaledb.continuous{$realtime}) AS
                        {$def['query']}
                        WITH NO DATA;
                    END IF;
                END
                \$cagg_{$name}\$;
                SQL);
            DB::unprepared("CREATE INDEX IF NOT EXISTS {$name}_{$def['index_suffix']} ON public.{$name} ({$def['index_cols']})");
            DB::unprepared("SELECT add_continuous_aggregate_policy('public.{$name}', '{$def['start_offset']}'::interval, '{$def['end_offset']}'::interval, '{$def['schedule']}'::interval, if_not_exists => TRUE)");
        }
    }

    /**
     * Cagg definitions mirror 2026_06_15_051749 (server_updates) and
     * 2026_08_24_162723 (server_network_stats), including realtime flags and
     * refresh policies.
     *
     * @return array<string, array{query: string, realtime: bool, index_suffix: string, index_cols: string, schedule: string, start_offset: string, end_offset: string}>
     */
    private static function caggs(): array
    {
        $updates = function (string $bucket): string {
            return <<<SQL
                SELECT
                    time_bucket('{$bucket}', created_at) AS timestamp,
                    server_id,
                    AVG(cpu_usage) AS cpu,
                    AVG(memory_usage) AS memory,
                    AVG(disk_usage) AS disk,
                    AVG(network_rbytes) AS netIn,
                    AVG(network_tbytes) AS netOut
                FROM server_updates
                GROUP BY timestamp, server_id
                SQL;
        };
        $networks = function (string $bucket): string {
            return <<<SQL
                SELECT
                    time_bucket('{$bucket}', created_at) AS timestamp,
                    server_id,
                    interface_name,
                    AVG(rx_bytes) AS netIn,
                    AVG(tx_bytes) AS netOut
                FROM server_network_stats
                GROUP BY timestamp, server_id, interface_name
                SQL;
        };

        return [
            'server_updates_agg_minute' => ['query' => $updates('1 minute'), 'realtime' => true, 'index_suffix' => 'server_id_timestamp_index', 'index_cols' => 'server_id, timestamp', 'schedule' => '1 minute', 'start_offset' => '1 hour', 'end_offset' => '1 minute'],
            'server_updates_agg_hour' => ['query' => $updates('1 hour'), 'realtime' => true, 'index_suffix' => 'server_id_timestamp_index', 'index_cols' => 'server_id, timestamp', 'schedule' => '1 hour', 'start_offset' => '24 hours', 'end_offset' => '1 hour'],
            'server_updates_agg_day' => ['query' => $updates('1 day'), 'realtime' => true, 'index_suffix' => 'server_id_timestamp_index', 'index_cols' => 'server_id, timestamp', 'schedule' => '1 hour', 'start_offset' => '7 days', 'end_offset' => '1 day'],
            'server_updates_agg_week' => ['query' => $updates('1 week'), 'realtime' => false, 'index_suffix' => 'server_id_timestamp_index', 'index_cols' => 'server_id, timestamp', 'schedule' => '6 hours', 'start_offset' => '2 months', 'end_offset' => '1 week'],
            'server_updates_agg_month' => ['query' => $updates('1 month'), 'realtime' => false, 'index_suffix' => 'server_id_timestamp_index', 'index_cols' => 'server_id, timestamp', 'schedule' => '1 hour', 'start_offset' => '6 months', 'end_offset' => '1 month'],
            'server_network_stats_agg_minute' => ['query' => $networks('1 minute'), 'realtime' => true, 'index_suffix' => 'server_id_interface_name_timestamp_index', 'index_cols' => 'server_id, interface_name, timestamp', 'schedule' => '1 minute', 'start_offset' => '1 hour', 'end_offset' => '1 minute'],
            'server_network_stats_agg_hour' => ['query' => $networks('1 hour'), 'realtime' => true, 'index_suffix' => 'server_id_interface_name_timestamp_index', 'index_cols' => 'server_id, interface_name, timestamp', 'schedule' => '1 hour', 'start_offset' => '24 hours', 'end_offset' => '1 hour'],
            'server_network_stats_agg_day' => ['query' => $networks('1 day'), 'realtime' => true, 'index_suffix' => 'server_id_interface_name_timestamp_index', 'index_cols' => 'server_id, interface_name, timestamp', 'schedule' => '1 hour', 'start_offset' => '7 days', 'end_offset' => '1 day'],
            'server_network_stats_agg_week' => ['query' => $networks('1 week'), 'realtime' => true, 'index_suffix' => 'server_id_interface_name_timestamp_index', 'index_cols' => 'server_id, interface_name, timestamp', 'schedule' => '6 hours', 'start_offset' => '2 months', 'end_offset' => '1 week'],
            'server_network_stats_agg_month' => ['query' => $networks('1 month'), 'realtime' => true, 'index_suffix' => 'server_id_interface_name_timestamp_index', 'index_cols' => 'server_id, interface_name, timestamp', 'schedule' => '1 day', 'start_offset' => '6 months', 'end_offset' => '1 month'],
        ];
    }

    public function down(): void
    {
        // Repair migration: nothing to roll back (it only adds objects that
        // were missing; dropping them would re-break healed databases).
    }
};
