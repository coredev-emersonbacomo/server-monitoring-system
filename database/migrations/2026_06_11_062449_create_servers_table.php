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
            $table->string('url');
            $table->string('server_name');
            $table->string('device_name');
            $table->float('cpu_usage');
            $table->float('memory_usage');
            $table->float('storage');
            $table->float('uptime');
            $table->float('network_rbytes');
            $table->float('network_tbytes');
            $table->foreignId('coop_id');
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
