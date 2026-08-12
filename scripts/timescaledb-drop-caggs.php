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
    // A half-broken install can leave some caggs as MATERIALIZED VIEWs (relkind 'm')
    // and others as plain VIEWs ('v'). DROP ... IF EXISTS does NOT skip when the
    // name is taken by a different object type, so look up the type first.
    $caggs = [
        'server_updates_agg_minute',
        'server_updates_agg_hour',
        'server_updates_agg_day',
        'server_updates_agg_week',
        'server_updates_agg_month',
    ];

    $existing = DB::select("
        SELECT c.relname, c.relkind
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname IN (" . implode(', ', array_fill(0, count($caggs), '?')) . ")
    ", $caggs);

    foreach ($existing as $cagg) {
        if ($cagg->relkind === 'm') {
            DB::statement('DROP MATERIALIZED VIEW IF EXISTS "' . $cagg->relname . '" CASCADE');
        } else {
            DB::statement('DROP VIEW IF EXISTS "' . $cagg->relname . '" CASCADE');
        }
    }

    $hypertables = DB::select("
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = '_timescaledb_internal'
          AND tablename LIKE '_materialized_hypertable_%'
    ");

    foreach ($hypertables as $ht) {
        DB::statement("DROP TABLE IF EXISTS _timescaledb_internal.{$ht->tablename} CASCADE");
    }

    echo "[resetdb] Cleaned TimescaleDB continuous aggregates and internal hypertables.\n";
} catch (\Throwable $e) {
    // Not PostgreSQL or TimescaleDB not present — safe to ignore.
    echo "[resetdb] TimescaleDB cleanup skipped: " . $e->getMessage() . "\n";
}
