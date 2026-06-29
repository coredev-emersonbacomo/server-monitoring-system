<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('profile_picture_storage_key')->nullable()->after('profile_picture_public_id');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->string('banner_image_storage_key')->nullable()->after('banner_image_public_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('profile_picture_storage_key');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('banner_image_storage_key');
        });
    }
};
