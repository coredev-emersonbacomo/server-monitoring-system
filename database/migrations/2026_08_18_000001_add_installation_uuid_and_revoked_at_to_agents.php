<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-installation agents.
     *
     * A physical computer can now host many independent agent installations.
     * Each installation carries an immutable installation_uuid that the
     * challenge/register/heartbeat flows bind to, and a revoked_at timestamp
     * for lifecycle termination. The server_id UNIQUE constraint is replaced
     * by a partial unique index so that at most one ACTIVE agent exists per
     * server, while historical (revoked/archived) agents can be kept for
     * audit purposes.
     */
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropUnique(['server_id']);
        });

        // The binding between agent and backend is now the installation UUID.
        // The legacy public_key_hash uniqueness made a second installation on
        // the same machine impossible to register (two keys can never share a
        // hash, but a re-keyed/reinstalled agent with the same key would 500).
        Schema::table('agents', function (Blueprint $table) {
            $table->dropUnique(['public_key_hash']);
        });

        Schema::table('agents', function (Blueprint $table) {
            $table->string('installation_uuid', 36)->nullable()->unique()->after('server_id');
            $table->timestamp('revoked_at')->nullable()->after('status');
        });

        // Partial unique index: at most one ACTIVE agent per server.
        DB::statement(
            "CREATE UNIQUE INDEX agents_server_id_active_unique ON agents (server_id) WHERE status = 'active'"
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS agents_server_id_active_unique');
        Schema::table('agents', function (Blueprint $table) {
            $table->dropUnique(['installation_uuid']);
            $table->dropColumn(['installation_uuid', 'revoked_at']);
            $table->unique(['server_id']);
        });
    }
};