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
        Schema::create('servers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->string('server_name');

            $table->string('device_name');

            // Network details
            $table->string('external_ip');
            $table->integer('ssh_port')->default(22);

            // SSH details
            $table->string('ssh_username');
            $table->text('ssh_password');

            // API Key
            $table->string('api_key');

            // TODO: add autoscript for getting specs
            $table->string('cpu_model')->nullable();
            $table->integer('cpu_cores')->nullable();
            $table->integer('ram')->nullable();
            $table->string('operating_system')->nullable();
            $table->string('record_status')->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('servers');
    }
};
