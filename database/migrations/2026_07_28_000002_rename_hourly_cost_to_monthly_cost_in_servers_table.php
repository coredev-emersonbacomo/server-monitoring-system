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
            // hourly_cost → monthly_rate (via monthly_cost intermediary already done)
            if (Schema::hasColumn('servers', 'hourly_cost') && !Schema::hasColumn('servers', 'monthly_cost')) {
                $table->renameColumn('hourly_cost', 'monthly_rate');
            } elseif (Schema::hasColumn('servers', 'hourly_cost')) {
                $table->renameColumn('hourly_cost', 'monthly_cost');
            }

            if (Schema::hasColumn('servers', 'monthly_cost')) {
                $table->renameColumn('monthly_cost', 'monthly_rate');
            }

            if (Schema::hasColumn('servers', 'cost_offset')) {
                $table->renameColumn('cost_offset', 'remitted');
            }

            if (Schema::hasColumn('servers', 'pending_monthly_cost')) {
                $table->renameColumn('pending_monthly_cost', 'pending_monthly_rate');
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
                $table->renameColumn('monthly_rate', 'hourly_cost');
            }
            if (Schema::hasColumn('servers', 'remitted')) {
                $table->renameColumn('remitted', 'cost_offset');
            }
            if (Schema::hasColumn('servers', 'pending_monthly_rate')) {
                $table->renameColumn('pending_monthly_rate', 'pending_monthly_cost');
            }
        });
    }
};
