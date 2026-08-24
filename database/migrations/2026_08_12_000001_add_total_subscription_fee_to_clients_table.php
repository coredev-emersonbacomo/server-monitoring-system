<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->decimal('total_subscription_fee', 12, 2)->default(0)->after('budget');
        });

        // Backfill from existing server subscription fees
        DB::statement('
            UPDATE clients
            SET total_subscription_fee = (
                SELECT COALESCE(SUM(s.subscription_fee), 0)
                FROM servers s
                WHERE s.client_id = clients.id
                  AND s.deleted_at IS NULL
            )
        ');
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('total_subscription_fee');
        });
    }
};
