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
        Schema::create('local_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained();
            $table->string('metric');
            $table->integer('threshold');
            $table->string('notification_channel');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('local_alerts');
    }
};
