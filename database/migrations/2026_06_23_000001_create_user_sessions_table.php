<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('session_uuid')->unique();
            $table->string('refresh_token_id', 64)->unique();
            $table->string('refresh_token_hash', 64);
            $table->string('previous_refresh_token_id', 64)->nullable();
            $table->string('previous_refresh_token_hash', 64)->nullable();
            $table->boolean('remember_me')->default(false);
            $table->string('device_name')->nullable();
            $table->string('device_type')->nullable();
            $table->string('browser')->nullable();
            $table->string('operating_system')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamp('last_refresh_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('compromised_at')->nullable();
            $table->string('compromise_reason')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('refresh_token_id');
            $table->index('expires_at');
            $table->index('revoked_at');
            $table->index('compromised_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_sessions');
    }
};
