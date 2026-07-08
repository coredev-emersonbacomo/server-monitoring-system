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
            'host_name' => fake()->word() . '-blade-' . fake()->randomDigitNotNull(),
            'operating_system' => fake()->randomElement(['Ubuntu 22.04 LTS', 'Windows Server 2022', 'Debian 12']),
            // Network details
            'external_ip' => fake()->ipv4(),
            'cpu_model' => fake()->randomElement(['Intel Xeon E5-2670', 'AMD EPYC 7742', 'Intel Core i9-11900K']),
            'cpu_cores' => fake()->randomElement([2, 4, 8, 16]),
            'ram' => fake()->randomElement(['16GB', '32GB', '64GB']),
            'disk' => fake()->randomElement(['256GB', '512GB', '1TB']),

            'api_key' => ApiGenerator::GenerateApiKey()
        ];
    }
}
