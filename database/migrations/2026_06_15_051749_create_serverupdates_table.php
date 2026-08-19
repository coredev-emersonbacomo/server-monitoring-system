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
    private bool $hasTimescale = false;

    public function up(): void
    {
        Schema::createExtensionIfNotExists('timescaledb');

        // ---------------------------------------------------------------
        // Raw hypertable
        // ---------------------------------------------------------------
        Schema::create('server_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained();
            $table->float('cpu_usage');
            $table->float('memory_usage');
            $table->float('disk_usage');
            $table->unsignedInteger('uptime');
            // bigInteger, since a busy server can push these past 4GB/interval
            $table->unsignedBigInteger('network_rbytes');
            $table->unsignedBigInteger('network_tbytes');
            $table->timestampTz('created_at');
            $table->timestampTz('updated_at')->nullable();

            // Hypertables need the partitioning column in every unique/primary key.
            $table->primary(['id', 'created_at']);
            $table->index(['server_id', 'created_at']);

            $table->timescale(
                new CreateHypertable('created_at', '1 day'),
                new EnableColumnstore(segmentBy: 'server_id'),
                new CreateColumnstorePolicy('3 days'),
                new CreateRetentionPolicy('1 year'),
            );
        });

        // ---------------------------------------------------------------
        // 1 minute rollup
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_updates_agg_minute', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 minute', created_at) AS timestamp,
                    server_id,
                    AVG(cpu_usage) AS cpu,
                    AVG(memory_usage) AS memory,
                    AVG(disk_usage) AS disk,
                    AVG(network_rbytes) AS netIn,
                    AVG(network_tbytes) AS netOut
                FROM server_updates
                GROUP BY timestamp, server_id
            ");
            $table->realtime();
            $table->index(['server_id', 'timestamp']);
            $table->timescale(
                // run every minute, look back 1 hour, don't touch the last minute (still filling)
                new CreateRefreshPolicy('1 minute', '1 hour', '1 minute'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('1 day'),
                // minute-level detail is rarely useful past a month, keep the cagg small
                new CreateRetentionPolicy('30 days'),
            );
        });

        // ---------------------------------------------------------------
        // 1 hour rollup
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_updates_agg_hour', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 hour', created_at) AS timestamp,
                    server_id,
                    AVG(cpu_usage) AS cpu,
                    AVG(memory_usage) AS memory,
                    AVG(disk_usage) AS disk,
                    AVG(network_rbytes) AS netIn,
                    AVG(network_tbytes) AS netOut
                FROM server_updates
                GROUP BY timestamp, server_id
            ");
            $table->realtime();
            $table->index(['server_id', 'timestamp']);
            $table->timescale(
                // run every minute, look back 1 hour, don't touch the last minute (still filling)
                new CreateRefreshPolicy('1 hour', '24 hour', '1 hour'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('1 day'),
                // minute-level detail is rrely useful past a month, keep the cagg small
                new CreateRetentionPolicy('2 month'),
            );
        });

        // ---------------------------------------------------------------
        // 1 day rollup
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_updates_agg_day', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 day', created_at) AS timestamp,
                    server_id,
                    AVG(cpu_usage) AS cpu,
                    AVG(memory_usage) AS memory,
                    AVG(disk_usage) AS disk,
                    AVG(network_rbytes) AS netIn,
                    AVG(network_tbytes) AS netOut
                FROM server_updates
                GROUP BY timestamp, server_id
            ");
            $table->realtime();
            $table->index(['server_id', 'timestamp']);
            $table->timescale(
                // run hourly, look back 7 days, leave the current day open until it's done
                new CreateRefreshPolicy('1 hour', '7 days', '1 day'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('7 days'),
            );
        });

        // ---------------------------------------------------------------
        // 1 week rollup
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_updates_agg_week', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 week', created_at) AS timestamp,
                    server_id,
                    AVG(cpu_usage) AS cpu,
                    AVG(memory_usage) AS memory,
                    AVG(disk_usage) AS disk,
                    AVG(network_rbytes) AS netIn,
                    AVG(network_tbytes) AS netOut
                FROM server_updates
                GROUP BY timestamp, server_id
            ");
            $table->index(['server_id', 'timestamp']);
            $table->timescale(
                // run every 6 hours, look back 2 months, leave the current week open
                new CreateRefreshPolicy('6 hours', '2 months', '1 week'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('1 month'),
            );
        });

        // ---------------------------------------------------------------
        // 1 month rollup
        // ---------------------------------------------------------------
        Schema::continuousAggregate('server_updates_agg_month', function (CaggBlueprint $table) {
            $table->as("
                SELECT
                    time_bucket('1 month', created_at) AS timestamp,
                    server_id,
                    AVG(cpu_usage) AS cpu,
                    AVG(memory_usage) AS memory,
                    AVG(disk_usage) AS disk,
                    AVG(network_rbytes) AS netIn,
                    AVG(network_tbytes) AS netOut
                FROM server_updates
                GROUP BY timestamp, server_id
            ");
            $table->index(['server_id', 'timestamp']);
            $table->timescale(
                // run daily, look back 6 months, leave the current month open
                new CreateRefreshPolicy('1 day', '6 months', '1 month'),
                new EnableColumnstore,
                new CreateColumnstorePolicy('3 months'),
            );
        });
    }

    public function down(): void
    {
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_updates_agg_month');
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_updates_agg_week');
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_updates_agg_day');
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_updates_agg_hour');
        DB::statement('DROP MATERIALIZED VIEW IF EXISTS server_updates_agg_minute');
        LaravelSchema::dropIfExists('server_updates');
    }
};
