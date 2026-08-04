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
            $columnsToDrop = [
                'monthly_rate',
                'pending_monthly_rate',
                'historical_cost',
                'accumulated_cost',
                'cost_offset',
                'remitted',
                'rate_updated_at',
                'cost_reset_at',
            ];

            foreach ($columnsToDrop as $column) {
                if (Schema::hasColumn('servers', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->decimal('monthly_rate', 16, 4)->default(0);
            $table->decimal('pending_monthly_rate', 16, 4)->nullable();
            $table->decimal('historical_cost', 16, 4)->default(0);
            $table->decimal('accumulated_cost', 16, 4)->default(0);
            $table->decimal('cost_offset', 16, 4)->default(0);
            $table->decimal('remitted', 16, 4)->default(0);
            $table->timestamp('rate_updated_at')->nullable();
            $table->timestamp('cost_reset_at')->nullable();
        });
    }
};
