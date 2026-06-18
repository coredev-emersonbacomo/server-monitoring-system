<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GlobalAlertSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('global_alerts')->insert([[
            'metric' => 'cpu_usage',
            'threshold' => 80,
            'notification_channel' => 'email'
        ],[
            'metric' => 'cpu_usage',
            'threshold' => 90,
            'notification_channel' => 'sms'
        ],
        [
            'metric' => 'ram_usage',
            'threshold' => 80,
            'notification_channel' => 'email'
        ],[
            'metric' => 'ram_usage',
            'threshold' => 90,
            'notification_channel' => 'sms'
        ],
        [
            'metric' => 'storage',
            'threshold' => 80,
            'notification_channel' => 'email'
        ],[
            'metric' => 'storage',
            'threshold' => 90,
            'notification_channel' => 'sms'
        ]]);
    }
}
