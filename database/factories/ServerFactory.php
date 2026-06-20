<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Server;
use Illuminate\Database\Eloquent\Factories\Factory;
use Infrastructure\Api\ApiGenerator;

class ServerFactory extends Factory
{
    protected $model = Server::class;

    public function definition(): array
    {
        return [
            'client_id' => Client::inRandomOrder()->first()?->id ?? Client::factory(),
            'server_name' => fake()->domainWord() . '-prod',
            'device_name' => fake()->word() . '-blade-' . fake()->randomDigitNotNull(),
            'operating_system' => fake()->randomElement(['Ubuntu 22.04 LTS', 'Windows Server 2022', 'Debian 12']),
            'internal_ip' => fake()->localIpv4(),
            'external_ip' => fake()->ipv4(),
            'api_key' => ApiGenerator::GenerateApiKey()
        ];
    }
}
