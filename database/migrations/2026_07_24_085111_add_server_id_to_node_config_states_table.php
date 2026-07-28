<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('node_config_states', function (Blueprint $table) {
            $table->unsignedBigInteger('server_id')->nullable()->after('node_id');
            $table->index(['node_config_id', 'server_id', 'node_id']);
        });
    }

    public function down(): void
    {
        Schema::table('node_config_states', function (Blueprint $table) {
            $table->dropIndex(['node_config_id', 'server_id', 'node_id']);
            $table->dropColumn('server_id');
        });
    }
};
