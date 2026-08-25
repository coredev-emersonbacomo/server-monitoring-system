<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Store the agent's registered public key (PKIX SPKI DER, base64-encoded).
        // The agent's private key never leaves the machine; the backend can only
        // verify challenge signatures against this public key.
        Schema::table('agents', function (Blueprint $table) {
            $table->text('public_key')->nullable()->after('protocol_version');
            $table->string('public_key_hash', 64)->nullable()->unique()->after('public_key');
        });

        // Single-use, short-lived cryptographic challenges for challenge-response auth.
        Schema::create('agent_challenges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('challenge', 128);
            $table->string('status')->default('pending'); // pending, used, expired
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_challenges');
        Schema::table('agents', function (Blueprint $table) {
            $table->dropUnique(['public_key_hash']);
            $table->dropColumn(['public_key', 'public_key_hash']);
        });
    }
};
