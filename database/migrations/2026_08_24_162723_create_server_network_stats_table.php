<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema as LaravelSchema;
use Tpetry\PostgresqlEnhanced\Schema\Blueprint;
use Tpetry\PostgresqlEnhanced\Schema\Timescale\Actions\CreateColumnstorePolicy;
use Tpetry\PostgresqlEnhanced\Schema\Timescale\Actions\CreateHypertable;
use Tpetry\PostgresqlEnhanced\Schema\Timescale\Actions\CreateRefreshPolicy;
use Tpetry\PostgresqlEnhanced\Schema\Timescale\Actions\CreateRetentionPolicy;
use Tpetry\PostgresqlEnhanced\Schema\Timescale\Actions\EnableColumnstore;
use Tpetry\PostgresqlEnhanced\Schema\Timescale\CaggBlueprint;
use Tpetry\PostgresqlEnhanced\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::createExtensionIfNotExists('timescaledb');

        // ---------------------------------------------------------------
        // Raw hypertable — one row per interface per heartbeat
        // ---------------------------------------------------------------
        Schema::create('server_network_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained();
            $table->string('interface_name');
            // ethernet / wifi / vpn / loopback / serial / infiniband / vlan / unknown
            $table->string('interface_type')->default('unknown');
            $table->string('oper_state')->default('unknown');
            // bigInteger, since a busy interface can push these past 4GB/interval
            $table->unsignedBigInteger('rx_bytes');
            $table->unsignedBigInteger('tx_bytes');
            $table->timestampTz('created_at');
            $table->timestampTz('updated_at')->nullable();

            // Hypertables need the partitioning column in every unique/primary key.
            $table->primary(['id', 'created_at']);
            $table->index(['server_id', 'interface_name', 'created_at']);

            $table->timescale(
                new CreateHypertable('created_at', '1 day'),
                new EnableColumnstore(segmentBy: ['server_id', 'interface_name']),
                new CreateColumnstorePolicy('3 days'),
                new CreateRetentionPolicy('1 year'),
            );
        });

        // ---------------------------------------------------------------
        // 1 minute rollup (per interface)
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_network_stats_agg_minute', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 minute', created_at) AS timestamp,
                    server_id,
                    interface_name,
                    AVG(rx_bytes) AS netIn,
                    AVG(tx_bytes) AS netOut
                FROM server_network_stats
                GROUP BY timestamp, server_id, interface_name
            ");
            $table->realtime();
            $table->index(['server_id', 'interface_name', 'timestamp']);
            $table->timescale(
                new CreateRefreshPolicy('1 minute', '1 hour', '1 minute'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('1 day'),
                new CreateRetentionPolicy('30 days'),
            );
        });

        // ---------------------------------------------------------------
        // 1 hour rollup (per interface)
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_network_stats_agg_hour', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 hour', created_at) AS timestamp,
                    server_id,
                    interface_name,
                    AVG(rx_bytes) AS netIn,
                    AVG(tx_bytes) AS netOut
                FROM server_network_stats
                GROUP BY timestamp, server_id, interface_name
            ");
            $table->realtime();
            $table->index(['server_id', 'interface_name', 'timestamp']);
            $table->timescale(
                new CreateRefreshPolicy('1 hour', '24 hour', '1 hour'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('1 day'),
                new CreateRetentionPolicy('2 month'),
            );
        });

        // ---------------------------------------------------------------
        // 1 day rollup (per interface)
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_network_stats_agg_day', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 day', created_at) AS timestamp,
                    server_id,
                    interface_name,
                    AVG(rx_bytes) AS netIn,
                    AVG(tx_bytes) AS netOut
                FROM server_network_stats
                GROUP BY timestamp, server_id, interface_name
            ");
            $table->realtime();
            $table->index(['server_id', 'interface_name', 'timestamp']);
            $table->timescale(
                new CreateRefreshPolicy('1 hour', '7 days', '1 day'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('7 days'),
            );
        });

        // ---------------------------------------------------------------
        // 1 week rollup (per interface)
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_network_stats_agg_week', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 week', created_at) AS timestamp,
                    server_id,
                    interface_name,
                    AVG(rx_bytes) AS netIn,
                    AVG(tx_bytes) AS netOut
                FROM server_network_stats
                GROUP BY timestamp, server_id, interface_name
            ");
            $table->realtime();
            $table->index(['server_id', 'interface_name', 'timestamp']);
            $table->timescale(
                new CreateRefreshPolicy('6 hours', '2 months', '1 week'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('1 month'),
            );
        });

        // ---------------------------------------------------------------
        // 1 month rollup (per interface)
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_network_stats_agg_month', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 month', created_at) AS timestamp,
                    server_id,
                    interface_name,
                    AVG(rx_bytes) AS netIn,
                    AVG(tx_bytes) AS netOut
                FROM server_network_stats
                GROUP BY timestamp, server_id, interface_name
            ");
            $table->realtime();
            $table->index(['server_id', 'interface_name', 'timestamp']);
            $table->timescale(
                new CreateRefreshPolicy('1 day', '6 months', '1 month'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('3 months'),
            );
        });
    }

    public function down(): void
    {
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_network_stats_agg_month');
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_network_stats_agg_week');
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_network_stats_agg_day');
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_network_stats_agg_hour');
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_network_stats_agg_minute');
        LaravelSchema::dropIfExists('server_network_stats');
    }
};
