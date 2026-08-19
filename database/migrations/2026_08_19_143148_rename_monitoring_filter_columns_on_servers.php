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
        Schema::table('servers', function (Blueprint $table) {
            $table->renameColumn('port_whitelist', 'port_filter');
            $table->renameColumn('process_whitelist', 'process_filter');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->renameColumn('port_filter', 'port_whitelist');
            $table->renameColumn('process_filter', 'process_whitelist');
        });
    }
};
