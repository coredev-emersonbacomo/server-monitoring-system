<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\User;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                
                'first_name' => 'Admin',
                'last_name'=> 'Surname',
                'email' => 'admin@example.com',
                'phone_number' => '09517380165',
                'password' => bcrypt('admin123'),
                'last_login' => now()
            ]
        );
    }
}