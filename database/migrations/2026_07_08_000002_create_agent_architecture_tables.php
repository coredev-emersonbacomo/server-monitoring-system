<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('provision_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained()->onDelete('cascade');
            $table->string('token')->unique();
            $table->string('status')->default('active'); // active, used, revoked, expired
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('token');
        });

        Schema::create('agent_installations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained()->onDelete('cascade');
            $table->string('installer_version');
            $table->string('operating_system')->nullable();
            $table->string('architecture')->nullable();
            $table->string('hostname')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->string('status'); // started, completed, failed
            $table->foreignId('initiated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->unique()->constrained()->onDelete('cascade');
            $table->string('version');
            $table->string('protocol_version');
            $table->integer('configuration_version')->default(1);
            $table->string('status'); // registering, online, offline, archived
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });

        Schema::create('agent_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('identity_hash')->unique();
            $table->string('status')->default('active'); // active, rotated, revoked
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index('identity_hash');
        });

        Schema::create('heartbeats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->integer('latency_ms')->nullable();
            $table->timestamp('agent_time')->nullable();
            $table->string('status'); // success, warning, error
            $table->timestamp('received_at')->useCurrent();
            $table->timestamps();

            $table->index('agent_id');
            $table->index('received_at');
        });

        Schema::create('metric_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('heartbeat_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('collector_version')->nullable();
            $table->timestamps();
        });

        Schema::create('metric_samples', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('metric_batches')->onDelete('cascade');
            $table->string('metric_type'); // cpu, memory, disk, network, uptime
            $table->string('metric_name');
            $table->double('value');
            $table->string('unit')->nullable();
            $table->timestamp('recorded_at')->useCurrent();

            $table->index('metric_type');
            $table->index('recorded_at');
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('identifier');
            $table->string('name');
            $table->string('state');
            $table->string('status')->nullable();
            $table->timestamp('last_seen')->useCurrent();
            $table->timestamps();

            $table->unique(['agent_id', 'identifier']);
        });

        Schema::create('ports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('protocol'); // tcp, udp
            $table->integer('port');
            $table->string('state');
            $table->string('process_name')->nullable();
            $table->timestamp('last_seen')->useCurrent();
            $table->timestamps();

            $table->unique(['agent_id', 'protocol', 'port']);
        });

        Schema::create('processes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->integer('pid');
            $table->string('name');
            $table->double('cpu')->nullable();
            $table->double('memory')->nullable();
            $table->text('command_line')->nullable();
            $table->timestamp('last_seen')->useCurrent();
            $table->timestamps();

            $table->unique(['agent_id', 'pid']);
        });

        Schema::create('agent_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->integer('version')->default(1);
            $table->integer('heartbeat_interval')->default(5);
            $table->integer('metrics_interval')->default(5);
            $table->integer('port_scan_interval')->default(60);
            $table->integer('service_scan_interval')->default(60);
            $table->integer('process_scan_interval')->default(60);
            $table->string('update_channel')->default('stable');
            $table->boolean('auto_update')->default(true);
            $table->json('configuration_json');
            $table->timestamps();
        });

        Schema::create('configuration_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->integer('version');
            $table->json('configuration_json');
            $table->timestamps();
        });

        Schema::create('agent_commands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('type');
            $table->integer('priority')->default(100);
            $table->json('payload')->nullable();
            $table->string('status')->default('pending'); // pending, sent, running, completed, failed, expired
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });

        Schema::create('command_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('command_id')->constrained('agent_commands')->onDelete('cascade');
            $table->string('status');
            $table->text('output')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('execution_time_ms')->nullable();
            $table->timestamp('reported_at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained()->onDelete('cascade');
            $table->foreignId('agent_id')->nullable()->constrained()->onDelete('set null');
            $table->string('type');
            $table->text('description');
            $table->json('metadata')->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('server_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activities');
        Schema::dropIfExists('command_results');
        Schema::dropIfExists('agent_commands');
        Schema::dropIfExists('configuration_history');
        Schema::dropIfExists('agent_configurations');
        Schema::dropIfExists('processes');
        Schema::dropIfExists('ports');
        Schema::dropIfExists('services');
        Schema::dropIfExists('metric_samples');
        Schema::dropIfExists('metric_batches');
        Schema::dropIfExists('heartbeats');
        Schema::dropIfExists('agent_identities');
        Schema::dropIfExists('agents');
        Schema::dropIfExists('agent_installations');
        Schema::dropIfExists('provision_tokens');
    }
};
