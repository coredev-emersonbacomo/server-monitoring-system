<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GlobalAlertSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('global_alerts')->insert([

            // CPU
            [
                'metric' => 'cpu_usage',
                'name' => 'Light',
                'threshold' => 25,
                'severity' => 'light',
                'channels' => json_encode(['email']),
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'metric' => 'cpu_usage',
                'name' => 'Warning',
                'threshold' => 60,
                'severity' => 'warning',
                'channels' => json_encode(['email', 'sms']),
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'metric' => 'cpu_usage',
                'name' => 'Critical',
                'threshold' => 90,
                'severity' => 'critical',
                'channels' => json_encode(['email', 'sms']),
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            // RAM
            [
                'metric' => 'ram_usage',
                'name' => 'Light',
                'threshold' => 30,
                'severity' => 'light',
                'channels' => json_encode(['email']),
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'metric' => 'ram_usage',
                'name' => 'Warning',
                'threshold' => 70,
                'severity' => 'warning',
                'channels' => json_encode(['email', 'sms']),
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'metric' => 'ram_usage',
                'name' => 'Critical',
                'threshold' => 90,
                'severity' => 'critical',
                'channels' => json_encode(['email', 'sms']),
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            // Storage
            [
                'metric' => 'storage',
                'name' => 'Light',
                'threshold' => 50,
                'severity' => 'light',
                'channels' => json_encode(['email']),
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'metric' => 'storage',
                'name' => 'Warning',
                'threshold' => 80,
                'severity' => 'warning',
                'channels' => json_encode(['email', 'sms']),
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'metric' => 'storage',
                'name' => 'Critical',
                'threshold' => 95,
                'severity' => 'critical',
                'channels' => json_encode(['email', 'sms']),
                'enabled' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

        ]);
    }
}