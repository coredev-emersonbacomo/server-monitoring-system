<?php

namespace Database\Factories;

use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClientFactory extends Factory
{
    protected $model = Client::class;

    public function definition(): array
    {
        $bannerImages = [
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            'https://www.allplan.com/fileadmin/_processed_/4/7/csm_w57-image-by-nic-lehoux_original_a82f2b39f2.jpg',
            'https://static.flickr.com/35/100571773_ec21b93bac_o.jpg',
            'https://www.touropia.com/gfx/b/2009/09/burj_al_arab.jpg',
            'https://amazingarchitecture.com/storage/files/1/Architecture%20firms/Umesh%20Bhosale/Statheros/20-Stretheros-Umesh-Bhosale-Skyscraper.jpg'
        ];

        return [
            'name' => fake()->company(),
            'description' => fake()->sentence(),
            'email' => fake()->unique()->companyEmail(),
            'contact_number' => fake()->numerify('09##########'),
            'location' => fake()->address(),
            'banner_image_url' => fake()->randomElement($bannerImages),
        ];
    }
}