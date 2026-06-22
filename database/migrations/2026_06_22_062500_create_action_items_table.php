<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('action_items', function (Blueprint $table) {
            $table->id();
            $table->string('action_type');
            $table->foreignId('server_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->string('message');
            $table->string('severity');
            $table->string('client_name')->nullable();
            $table->string('server_name')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('open');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['action_type', 'server_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('action_items');
    }
};
