<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refresh_token_rotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('user_sessions')->cascadeOnDelete();
            $table->string('refresh_token_id', 64);
            $table->string('refresh_token_hash', 64);
            $table->timestamp('rotated_at');
            $table->timestamps();

            $table->index('session_id');
            $table->index('refresh_token_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refresh_token_rotations');
    }
};
