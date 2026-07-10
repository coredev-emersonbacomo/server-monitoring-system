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
            ['value' => '5', 'updated_at' => now(), 'created_at' => now()]
        );
    }
}
