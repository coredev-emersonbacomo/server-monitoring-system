<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('watched_paths', function (Blueprint $table) {
            $table->id();
            $table->string('path');
            // agent | server — agent-scoped paths apply to the whole agent install,
            // server-scoped paths apply to a single server owned by the agent.
            $table->string('scope')->default('agent');
            $table->foreignId('server_id')->nullable()->constrained()->onDelete('cascade');
            $table->boolean('enabled')->default(true);
            $table->boolean('recursive')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();

            // A path is unique per scope; server-scoped paths are unique per server.
            $table->unique(['path', 'scope', 'server_id'], 'watched_paths_path_scope_server_unique');
            $table->index(['scope', 'enabled']);
        });

        Schema::create('file_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid', 64)->unique();
            $table->foreignId('server_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            // created | modified | moved | renamed | deleted
            $table->string('action');
            $table->string('file_name');
            $table->text('source_path');
            $table->text('destination_path')->nullable();
            $table->boolean('is_directory')->default(false);
            $table->string('username')->nullable();
            $table->string('process_name')->nullable();
            $table->unsignedBigInteger('process_id')->nullable();
            $table->timestampTz('occurred_at');
            $table->timestamps();

            $table->index(['server_id', 'occurred_at']);
            $table->index(['agent_id', 'occurred_at']);
            $table->index('action');
            $table->index('source_path');
        });

        Schema::create('agent_lifecycle_events', function (Blueprint $table) {
            $table->id();
            $table->string('uuid', 64)->unique();
            $table->foreignId('server_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            // started | stopping | stopped | unexpectedly_disconnected
            $table->string('event_type');
            $table->timestampTz('occurred_at');
            $table->timestamps();

            $table->index(['server_id', 'occurred_at']);
            $table->index(['agent_id', 'occurred_at']);
            $table->index('event_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_lifecycle_events');
        Schema::dropIfExists('file_activity_logs');
        Schema::dropIfExists('watched_paths');
    }
};
