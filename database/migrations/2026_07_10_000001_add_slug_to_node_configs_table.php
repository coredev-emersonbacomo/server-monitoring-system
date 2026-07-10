<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('node_configs', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
        });

        DB::table('node_configs')->where('name', 'Alert Config')->update(['slug' => 'alerts']);

        Schema::table('node_configs', function (Blueprint $table) {
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('node_configs', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
