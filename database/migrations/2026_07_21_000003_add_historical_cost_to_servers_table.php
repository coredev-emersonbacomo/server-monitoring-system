<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->decimal('historical_cost', 10, 4)->default(0.0000)->after('hourly_cost');
            $table->timestamp('rate_updated_at')->nullable()->after('historical_cost');
        });
    }

    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->dropColumn(['historical_cost', 'rate_updated_at']);
        });
    }
};
