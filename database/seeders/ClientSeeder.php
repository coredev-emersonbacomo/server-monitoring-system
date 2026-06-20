<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Infrastructure\Api\ApiGenerator;

class ClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table("clients")->insert([
            'name' => 'coredev',
            'description' => 'Software Company',
            'email' => 'coredev@gmail.com',
            'contact_number' => 'coredev@gmail.com',
            'location' => 'Cebu City',
        ]);

        DB::table("servers")->insert([
            'client_id' => 1,
            'cpu_cores' => 4,
            'ram' => 16,
            'server_name' => 'server-1',
            'device_name' => 'Thinkpad',
            'internal_ip' => '192.168.1.1',
            'external_ip' => '127.0.0.1',
            'operating_system' => 'Ubuntu 20.04',
            'api_key' => ApiGenerator::GenerateApiKey()
        ]);
    }
}
