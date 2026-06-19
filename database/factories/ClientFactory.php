<?php

namespace Database\Factories;

use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClientFactory extends Factory
{
    protected $model = Client::class;

    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'description' => fake()->sentence(),
            'email' => fake()->unique()->companyEmail(),
            'contact_number' => fake()->numerify('09##########'),
            'location' => fake()->address(),
            'banner_image_url' => '',
        ];
    }
}