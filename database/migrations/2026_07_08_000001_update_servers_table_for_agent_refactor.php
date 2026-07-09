<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            // Make existing SSH / key fields nullable
            $table->string('external_ip')->nullable()->change();
            $table->string('ssh_username')->nullable()->change();
            $table->text('ssh_password')->nullable()->change();
            $table->integer('ssh_port')->nullable()->change();
            $table->string('api_key')->nullable()->change();

            // Add new fields
            $table->text('description')->nullable();
            $table->string('environment')->nullable();
            $table->string('status')->default('pending_installation');
            $table->string('architecture')->nullable();
            $table->timestamp('archived_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->string('external_ip')->nullable(false)->change();
            $table->string('ssh_username')->nullable(false)->change();
            $table->text('ssh_password')->nullable(false)->change();
            $table->integer('ssh_port')->nullable(false)->change();
            $table->string('api_key')->nullable(false)->change();

            $table->dropColumn(['description', 'environment', 'status', 'architecture', 'archived_at']);
        });
    }
};
