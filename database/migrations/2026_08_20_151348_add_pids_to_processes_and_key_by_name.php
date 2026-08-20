<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Processes are grouped by name (Task Manager style): one row per name
     * with summed CPU/memory and the list of PIDs. Key by (agent_id, name)
     * instead of (agent_id, pid), and carry the pid list so the UI can show
     * "chrome (9)" and truncate the PID column.
     */
    public function up(): void
    {
        Schema::table('processes', function (Blueprint $table) {
            $table->dropUnique(['agent_id', 'pid']);
            $table->json('pids')->nullable()->after('pid');
        });

        // Old rows were per-PID (one row per process instance), which violates
        // the new per-name key. Grouping is done by the agent now; the next
        // heartbeat repopulates the table, so dropping the legacy rows is safe.
        DB::table('processes')->delete();

        Schema::table('processes', function (Blueprint $table) {
            $table->unique(['agent_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('processes', function (Blueprint $table) {
            $table->dropUnique(['agent_id', 'name']);
            $table->dropColumn('pids');
            $table->unique(['agent_id', 'pid']);
        });
    }
};
