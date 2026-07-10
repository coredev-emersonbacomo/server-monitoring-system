<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('node_configs', function (Blueprint $table) {
            $table->json('compiled_config')->nullable()->after('config');
        });
    }

    public function down(): void
    {
        Schema::table('node_configs', function (Blueprint $table) {
            $table->dropColumn('compiled_config');
        });
    }
};
