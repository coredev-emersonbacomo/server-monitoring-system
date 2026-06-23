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
            $table->foreignId('client_id')->constrained();
            $table->string('server_name');
            $table->string('device_name');
            $table->string('internal_ip');
            $table->string('external_ip');

            $table->string('ssh_username')->nullable();
            $table->text('ssh_password')->nullable();

            // API Key
            $table->string('api_key');

            // TODO: add autoscript for getting specs
            $table->integer('cpu_cores')->nullable();
            $table->integer('ram')->nullable();
            $table->string('operating_system')->nullable();
            $table->string('status')->default('online');
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
