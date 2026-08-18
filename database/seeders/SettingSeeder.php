<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'secop_limit_per_client'],
            ['value' => '2', 'updated_at' => now(), 'created_at' => now()]
        );

        DB::table('settings')->updateOrInsert(
            ['key' => 'heartbeat_interval'],
            ['value' => '5', 'updated_at' => now(), 'created_at' => now()]
        );

        DB::table('settings')->updateOrInsert(
            ['key' => 'offline_threshold'],
            ['value' => '15', 'updated_at' => now(), 'created_at' => now()]
        );

        // debug — seed port ping to match the default heartbeat interval (5s) so
        // results/alerting are easy to observe. Production default is 1min (60s).
        DB::table('settings')->updateOrInsert(
            ['key' => 'port_ping_interval'],
            ['value' => '5', 'updated_at' => now(), 'created_at' => now()]
        );

        DB::table('agent_versions')->updateOrInsert(
            ['version' => '2.0'],
            [
                'description' => 'Initial agent version',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
