<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Server;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Infrastructure\Api\ApiGenerator;

class ServerFactory extends Factory
{
    protected $model = Server::class;

    public function definition(): array
    {
        return [
            //'user_id' => fn () => User::inRandomOrder()->first()?->id ?? User::factory(),
            'client_id' => Client::inRandomOrder()->first()?->id ?? Client::factory(),
            'server_name' => fake()->domainWord() . '-prod',
            'device_name' => fake()->word() . '-blade-' . fake()->randomDigitNotNull(),
            'operating_system' => fake()->randomElement(['Ubuntu 22.04 LTS', 'Windows Server 2022', 'Debian 12']),
            // Network details
            'external_ip' => fake()->ipv4(),
            'ssh_port' => fake()->numberBetween(0, 9999),

            'api_key' => ApiGenerator::GenerateApiKey()
        ];
    }
}
