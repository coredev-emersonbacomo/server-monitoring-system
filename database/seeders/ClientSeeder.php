<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Infrastructure\Api\ApiGenerator;
use App\Models\Client;
use App\Models\Server;
use App\Models\User;
use Illuminate\Support\Str;


class ClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::first();
        if (!$user) {
            $this->command->error('Please run AdminSeeder first, no users found.');
            return;
        }
        $client = Client::updateOrCreate(
            ['email' => 'coredev@gmail.com'],
            [
                'uuid' => (string) Str::uuid7(),
                'name' => 'coredev',
                'description' => 'Software Company',
                'contact_number' => '09517380165',
                'location' => 'Cebu City',
            ]
        );

        $client->servers()->updateOrCreate(
            ['server_name' => 'server-1'],
            [
               // 'user_id' => $user->id,
                'device_name' => 'Thinkpad',
                'cpu_cores' => 4,
                'ram' => 16,
                'internal_ip' => '192.168.1.1',
                'external_ip' => '127.0.0.1',
                'operating_system' => 'Ubuntu 20.04',
                'api_key' => ApiGenerator::GenerateApiKey(),
                'port' => 22,
            ]
        );
    }
}
