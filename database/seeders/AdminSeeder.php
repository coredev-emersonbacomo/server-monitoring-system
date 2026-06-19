<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Enums\UserRole;


class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table("users")->updateOrInsert(
            ['username' => 'admin'],
            [
                'first_name' => 'Admin',
                'last_name'=> 'Surname',
                'email' => 'admin@example.com',
                'contact_number' => '1234567890',
                'password' => bcrypt('admin123'),
                'role_id' => UserRole::Admin->value,
                'created_at' => now(),
                'updated_at'=> now(),
                'profile_picture_url'=> 'laracasts.com',
                'last_login' => now()
            ]
        );
    }
}