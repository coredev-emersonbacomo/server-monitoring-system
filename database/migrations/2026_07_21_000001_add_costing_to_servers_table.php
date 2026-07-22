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
            $table->decimal('hourly_cost', 10, 4)->default(0.0000)->after('description');
            $table->decimal('cost_offset', 10, 4)->default(0.0000)->after('hourly_cost');
            $table->timestamp('cost_reset_at')->nullable()->after('cost_offset');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->dropColumn(['hourly_cost', 'cost_offset', 'cost_reset_at']);
        });
    }
};
