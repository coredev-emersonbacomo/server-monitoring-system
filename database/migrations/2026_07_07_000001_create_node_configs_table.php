<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('node_configs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('config');
            $table->boolean('enabled')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('node_config_states', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('node_config_id');
            $table->string('node_id');
            $table->json('output_value')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();

            $table->foreign('node_config_id')->references('id')->on('node_configs')->cascadeOnDelete();
            $table->unique(['node_config_id', 'node_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('node_config_states');
        Schema::dropIfExists('node_configs');
    }
};
