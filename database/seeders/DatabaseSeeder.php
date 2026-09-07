<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Server;
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
            UserSeeder::class,
            ClientSeeder::class,
            GlobalAlertSeeder::class,
            NodeConfigSeeder::class,
            WatchedPathSeeder::class,
        ]);

        // Demo data alongside the fixed seed records above.
        // 25 users total (admin + 24), 10 clients total, ~100 servers.
        User::factory(24)->create();
        Client::factory(9)->has(Server::factory()->count(8))->create();
        Server::factory(28)->create();

        // Make seeded user a secop to every client
        $user = User::where('username', 'user')->first();
        if ($user) {
            foreach (Client::all() as $client) {
                if (! $client->secopclients()->where('user_id', $user->id)->exists()) {
                    $client->secopclients()->attach($user->id, [
                        'uuid' => (string) Str::uuid7(),
                        'record_status' => 'active',
                    ]);
                }
            }
        }
    }
}
