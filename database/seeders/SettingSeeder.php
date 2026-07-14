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

        DB::table('agent_versions')->updateOrInsert(
            ['version' => '2.0'],
            [
                'type' => 'heartbeat_interval_update',
                'heartbeat_interval' => 5,
                'description' => 'Initial agent version',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
