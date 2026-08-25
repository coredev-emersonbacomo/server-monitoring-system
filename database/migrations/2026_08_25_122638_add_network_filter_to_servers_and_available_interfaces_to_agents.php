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
            $table->json('network_filter')->nullable()->after('process_filter');
        });

        Schema::table('agents', function (Blueprint $table) {
            $table->json('available_interfaces')->nullable()->after('available_ports');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn('available_interfaces');
        });

        Schema::table('servers', function (Blueprint $table) {
            $table->dropColumn('network_filter');
        });
    }
};
