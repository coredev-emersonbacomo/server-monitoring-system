<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('server_updates', function (Blueprint $table) {
            $table->dropForeign(['server_id']);
            $table->foreign('server_id')
                ->references('id')
                ->on('servers')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('server_updates', function (Blueprint $table) {
            $table->dropForeign(['server_id']);
            $table->foreign('server_id')
                ->references('id')
                ->on('servers');
        });
    }
};
