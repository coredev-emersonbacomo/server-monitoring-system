<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        $profilePictures = [
            'https://res.cloudinary.com/dwpiboxib/image/upload/profile_pictures/user_1/7cd1121e-a7ba-4f27-93d3-eda6f342d0ca',
            'https://res.cloudinary.com/dwpiboxib/image/upload/profile_pictures/user_1/cd1a2e9c-d979-4023-b165-de5569e80f12',
            'https://res.cloudinary.com/dwpiboxib/image/upload/profile_pictures/user_1/eba58a04-01f5-426d-9872-d717fc5ee3de',
            'https://res.cloudinary.com/dwpiboxib/image/upload/profile_pictures/user_1/feb8262d-f9a0-4a82-9d7b-0d5f7494c3e4',
            'https://res.cloudinary.com/dwpiboxib/image/upload/profile_pictures/user_1/da4ae1eb-9547-4905-972d-e087692456f9',
            'https://res.cloudinary.com/dwpiboxib/image/upload/profile_pictures/user_1/ac73a7ab-ab87-4413-8f24-2ecb5ace70ee',
            'https://res.cloudinary.com/dwpiboxib/image/upload/profile_pictures/user_1/13eb8bc2-d6df-404b-932a-f3e6e378a647'
        ];

        return [
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone_number' => fake()->numerify('09#########'),
            'timezone' => 'Asia/Manila',
            'username' => fake()->unique()->userName(),
            'password' => static::$password ??= Hash::make('password'),
            'profile_picture_url' => fake()->randomElement($profilePictures),
            'last_login' => fake()->dateTimeThisMonth(),
            'remember_token' => Str::random(10),
        ];
    }
}