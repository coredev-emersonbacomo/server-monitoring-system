<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('password_reset_tokens', function (Blueprint $table) {
            $table->dropColumn('token');
            $table->string('code', 255)->nullable()->after('email');
            $table->timestamp('code_expires_at')->nullable()->after('code');
            $table->string('reset_token', 255)->nullable()->after('code_expires_at');
            $table->timestamp('reset_token_expires_at')->nullable()->after('reset_token');
        });
    }

    public function down(): void
    {
        Schema::table('password_reset_tokens', function (Blueprint $table) {
            $table->string('token')->nullable()->after('email');
            $table->dropColumn([
                'code',
                'code_expires_at',
                'reset_token',
                'reset_token_expires_at',
            ]);
        });
    }
};
