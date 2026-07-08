<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('systemlogs', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->string('logable_type');
            $blueprint->string('logable_id');
            $blueprint->unsignedBigInteger('user_id')->nullable();
            $blueprint->string('user')->nullable();
            $blueprint->string('action');
            $blueprint->text('details')->nullable(false);

            $blueprint->timestamps();

            $blueprint->index(['logable_type', 'logable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('systemlogs');
    }
};
