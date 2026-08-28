<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('watched_paths', function (Blueprint $table) {
            $table->json('exclude_patterns')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('watched_paths', function (Blueprint $table) {
            $table->dropColumn('exclude_patterns');
        });
    }
};
