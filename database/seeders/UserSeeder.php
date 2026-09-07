<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['username' => 'user'],
            [
                'uuid' => (string) Str::uuid7(),
                'first_name' => 'User',
                'last_name' => 'Surname',
                'email' => 'user@example.com',
                'phone_number' => '09517380165',
                'timezone' => 'Asia/Manila',
                'password' => bcrypt('user123'),
                'last_login' => now(),
            ]
        );
    }
}
