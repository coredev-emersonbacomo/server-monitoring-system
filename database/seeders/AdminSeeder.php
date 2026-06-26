<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Enums\UserRole;
use Illuminate\Support\Str;

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
                'uuid' => (string) Str::uuid7(),
                'first_name' => 'Admin',
                'last_name'=> 'Surname',
                'email' => 'admin@example.com',
                'phone_number' => '09517380165',
                'password' => bcrypt('admin123'),
                'created_at' => now(),
                'updated_at'=> now(),
                'last_login' => now()
                
            ]
        );
    }
}