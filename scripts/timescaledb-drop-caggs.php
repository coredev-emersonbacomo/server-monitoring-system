<?php

/**
 * timescaledb-drop-caggs.php
 *
 * Drops leftover TimescaleDB continuous aggregate internal hypertables so that
 * `migrate:fresh` + re-running the serverupdates migration does not fail with
 * "relation _materialized_hypertable_N already exists".
 *
 * This is PostgreSQL/TimescaleDB specific. On other databases it is a no-op.
 *
 * Runs inside `php artisan tinker --execute`, so the app is already booted —
 * booting it again here throws "facade root already set" and silently skips
 * the whole cleanup.
 */
use Illuminate\Support\Facades\DB;

try {
    // Discover every cagg in public from the catalog instead of hardcoding
    // names — new migrations adding caggs stay covered automatically.
    $caggs = DB::select("
        SELECT view_name
        FROM timescaledb_information.continuous_aggregates
        WHERE view_schema = 'public'
    ");

    foreach ($caggs as $cagg) {
        // Realtime caggs show relkind 'v' in pg_class, but TimescaleDB only
        // accepts DROP MATERIALIZED VIEW for them (plain DROP VIEW throws
        // "cannot drop continuous aggregate using DROP VIEW"). Try matview
        // first, fall back to plain view.
        try {
            DB::statement('DROP MATERIALIZED VIEW IF EXISTS "'.$cagg->view_name.'" CASCADE');
        } catch (Throwable) {
            DB::statement('DROP VIEW IF EXISTS "'.$cagg->view_name.'" CASCADE');
        }
    }

    // Sweep orphaned materialization hypertables the cagg drops above did not
    // remove. Per-table try/catch: a table still owned by a live cagg will be
    // handled by `migrate:fresh` dropping public tables with CASCADE.
    $hypertables = DB::select("
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = '_timescaledb_internal'
          AND tablename LIKE '_materialized_hypertable_%'
    ");

    foreach ($hypertables as $ht) {
        try {
            DB::statement("DROP TABLE IF EXISTS _timescaledb_internal.{$ht->tablename} CASCADE");
        } catch (Throwable $e) {
            echo "[resetdb] Skipped {$ht->tablename}: ".$e->getMessage()."\n";
        }
    }

    echo '[resetdb] Cleaned '.count($caggs).' continuous aggregate(s)'.(count($hypertables) > 0 ? ' and '.count($hypertables).' orphaned hypertable(s)' : '')."\n";
} catch (Throwable $e) {
    // Not PostgreSQL or TimescaleDB not present — safe to ignore.
    echo '[resetdb] TimescaleDB cleanup skipped: '.$e->getMessage()."\n";
}
