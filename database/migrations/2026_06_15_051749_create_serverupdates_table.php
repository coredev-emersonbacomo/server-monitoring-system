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
        Schema::create('server_updates', function (Blueprint $table) {
            $table->foreignId('server_id')->constrained();
            $table->float('cpu_usage');
            $table->float('memory_usage');
            $table->float('storage')->unsigned(true);
            $table->int('uptime')->unsigned(true);
            $table->int('network_rbytes')->unsigned(true);
            $table->int('network_tbytes')->unsigned(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('server_updates');
    }
};
