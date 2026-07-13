<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
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
            [
                'name' => 'server-1',
            ],
            [
                'uuid' => (string) Str::uuid7(),
                'host_name' => 'Thinkpad',
            ]
        );
    }
}
