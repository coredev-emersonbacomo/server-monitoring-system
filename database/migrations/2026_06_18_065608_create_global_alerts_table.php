<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('global_alerts', function (Blueprint $table) {
            $table->id();

            $table->string('metric');

            $table->string('name');

            $table->unsignedTinyInteger('threshold');

            $table->enum('severity', [
                'light',
                'warning',
                'critical',
            ]);

            $table->json('channels');

            $table->boolean('enabled')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('global_alerts', function (Blueprint $table) {

            $table->string('notification_channel');

            $table->dropColumn([
                'name',
                'severity',
                'channels',
                'enabled',
                'created_at',
                'updated_at',
            ]);
        });
    }
};
