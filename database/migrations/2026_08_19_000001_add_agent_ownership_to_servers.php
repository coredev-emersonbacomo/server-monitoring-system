<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One agent installation now owns many servers.
     *
     * The canonical ownership becomes servers.agent_id (a server belongs to
     * exactly one agent). agents.server_id is retained as a nullable legacy
     * "primary/last server" pointer for backward compatibility, and the partial
     * unique index (one active agent per server) is dropped so a single
     * installation can serve several servers. servers.port_whitelist and
     * servers.process_whitelist hold the per-server monitoring filter (null =
     * monitor everything that passes the agent's built-in noise filter) that
     * the agent mirrors in memory.
     */
    public function up(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->foreignId('agent_id')->nullable()->after('id')->constrained('agents')->nullOnDelete();
            $table->json('port_whitelist')->nullable()->after('agent_deleted');
            $table->json('process_whitelist')->nullable()->after('port_whitelist');
            $table->index('agent_id');
        });

        $driver = DB::getDriverName();

        // The partial unique index is dropped so one installation can serve
        // several servers. It's a plain index (created by a raw statement), so
        // Postgres requires DROP INDEX without the MySQL "ON table" suffix.
        DB::statement(
            $driver === 'pgsql'
                ? 'DROP INDEX IF EXISTS agents_server_id_active_unique'
                : 'DROP INDEX agents_server_id_active_unique ON agents'
        );

        Schema::table('agents', function (Blueprint $table) {
            $table->unsignedBigInteger('server_id')->nullable()->change();
        });

        // Backfill: every server that already has an active agent is owned by it.
        DB::statement(
            $driver === 'pgsql'
                ? "UPDATE servers s SET agent_id = a.id FROM agents a WHERE a.server_id = s.id AND a.status = 'active'"
                : "UPDATE servers s JOIN agents a ON a.server_id = s.id AND a.status = 'active' SET s.agent_id = a.id"
        );
    }

    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->dropIndex(['agent_id']);
            $table->dropForeign(['agent_id']);
            $table->dropColumn(['agent_id', 'port_whitelist', 'process_whitelist']);
        });

        Schema::table('agents', function (Blueprint $table) {
            $table->unsignedBigInteger('server_id')->nullable(false)->change();
        });

        DB::statement(
            "CREATE UNIQUE INDEX agents_server_id_active_unique ON agents (server_id) WHERE status = 'active'"
        );
    }
};
