<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            SettingSeeder::class,
            AdminSeeder::class,
            ClientSeeder::class,
            GlobalAlertSeeder::class,
            NodeConfigSeeder::class,
        ]);

        // Make admin a secop to every client
        $admin = User::where('username', 'admin')->first();
        if ($admin) {
            foreach (Client::all() as $client) {
                if (! $client->secopclients()->where('user_id', $admin->id)->exists()) {
                    $client->secopclients()->attach($admin->id, [
                        'uuid' => (string) Str::uuid7(),
                        'record_status' => 'active',
                    ]);
                }
            }
        }
    }
}
