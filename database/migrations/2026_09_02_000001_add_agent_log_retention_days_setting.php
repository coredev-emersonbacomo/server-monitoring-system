<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('settings')->updateOrInsert(
            ['key' => 'agent_log_retention_days'],
            ['key' => 'agent_log_retention_days', 'value' => '60', 'created_at' => $now, 'updated_at' => $now],
        );
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'agent_log_retention_days')->delete();
    }
};
