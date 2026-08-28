<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Composite keys back the stable (occurred_at, id) cursor used by the
        // audit list endpoints' hybrid pagination.
        Schema::table('file_activity_logs', function (Blueprint $table) {
            $table->index(['occurred_at', 'id'], 'file_activity_logs_cursor_index');
        });

        Schema::table('agent_lifecycle_events', function (Blueprint $table) {
            $table->index(['occurred_at', 'id'], 'agent_lifecycle_events_cursor_index');
        });
    }

    public function down(): void
    {
        Schema::table('file_activity_logs', function (Blueprint $table) {
            $table->dropIndex('file_activity_logs_cursor_index');
        });

        Schema::table('agent_lifecycle_events', function (Blueprint $table) {
            $table->dropIndex('agent_lifecycle_events_cursor_index');
        });
    }
};
