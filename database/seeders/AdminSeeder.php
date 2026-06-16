<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
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
        DB::table("users")->insert([
            'first_name' => 'Admin',
            'last_name'=> 'Surname',
            'email' => 'admin@example.com',
            'username' => 'admin',
            'password' => bcrypt('admin'),
            'role_id' => UserRole::Admin->value,
            'created_at' => now()
        ]);
    }
}
