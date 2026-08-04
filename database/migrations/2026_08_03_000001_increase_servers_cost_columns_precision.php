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
            if (Schema::hasColumn('servers', 'monthly_rate')) {
                $table->decimal('monthly_rate', 16, 4)->default(0.0000)->change();
            }
            if (Schema::hasColumn('servers', 'pending_monthly_rate')) {
                $table->decimal('pending_monthly_rate', 16, 4)->nullable()->change();
            }
            if (Schema::hasColumn('servers', 'pending_monthly_cost')) {
                $table->decimal('pending_monthly_cost', 16, 4)->nullable()->change();
            }
            if (Schema::hasColumn('servers', 'historical_cost')) {
                $table->decimal('historical_cost', 16, 4)->default(0.0000)->change();
            }
            if (Schema::hasColumn('servers', 'cost_offset')) {
                $table->decimal('cost_offset', 16, 4)->default(0.0000)->change();
            }
            if (Schema::hasColumn('servers', 'remitted')) {
                $table->decimal('remitted', 16, 4)->default(0.0000)->change();
            }
            if (Schema::hasColumn('servers', 'accumulated_cost')) {
                $table->decimal('accumulated_cost', 16, 4)->default(0.0000)->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            if (Schema::hasColumn('servers', 'monthly_rate')) {
                $table->decimal('monthly_rate', 10, 4)->default(0.0000)->change();
            }
            if (Schema::hasColumn('servers', 'pending_monthly_rate')) {
                $table->decimal('pending_monthly_rate', 10, 4)->nullable()->change();
            }
            if (Schema::hasColumn('servers', 'pending_monthly_cost')) {
                $table->decimal('pending_monthly_cost', 10, 4)->nullable()->change();
            }
            if (Schema::hasColumn('servers', 'historical_cost')) {
                $table->decimal('historical_cost', 10, 4)->default(0.0000)->change();
            }
            if (Schema::hasColumn('servers', 'cost_offset')) {
                $table->decimal('cost_offset', 10, 4)->default(0.0000)->change();
            }
            if (Schema::hasColumn('servers', 'remitted')) {
                $table->decimal('remitted', 10, 4)->default(0.0000)->change();
            }
            if (Schema::hasColumn('servers', 'accumulated_cost')) {
                $table->decimal('accumulated_cost', 12, 2)->default(0.00)->change();
            }
        });
    }
};
