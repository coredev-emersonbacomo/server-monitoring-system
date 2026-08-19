<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            if (! Schema::hasColumn('servers', 'accumulated_cost')) {
                $table->decimal('accumulated_cost', 12, 2)->default(0.00)->after('historical_cost');
            }
        });
    }

    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            if (Schema::hasColumn('servers', 'accumulated_cost')) {
                $table->dropColumn('accumulated_cost');
            }
        });
    }
};
