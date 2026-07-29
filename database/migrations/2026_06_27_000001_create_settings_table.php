<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        $now = now();
        DB::table('settings')->insert([
            ['key' => 'secop_limit_per_client', 'value' => '2', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'heartbeat_interval',     'value' => '5000', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'offline_threshold',      'value' => '15000', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
