<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('watched_paths', 'recursive')) {
            Schema::table('watched_paths', function (Blueprint $table) {
                $table->dropColumn('recursive');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('watched_paths', 'recursive')) {
            Schema::table('watched_paths', function (Blueprint $table) {
                $table->boolean('recursive')->default(true)->after('enabled');
            });
        }
    }
};
