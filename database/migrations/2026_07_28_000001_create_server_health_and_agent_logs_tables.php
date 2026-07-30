<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('server_health_logs', function (Blueprint $table) {
            $table->id();
            $table->string('logable_type')->nullable();
            $table->string('logable_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('user')->nullable();
            $table->string('title');
            $table->json('details')->nullable();
            $table->string('severity')->nullable()->default('warning');
            $table->timestamps();
        });

        Schema::create('agent_logs', function (Blueprint $table) {
            $table->id();
            $table->string('logable_type')->nullable();
            $table->string('logable_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('user')->nullable();
            $table->string('action');
            $table->json('details')->nullable();
            $table->timestamps();
        });

        // Migrate existing logs into their respective tables if activity_logs exists
        if (Schema::hasTable('activity_logs')) {
            $logs = DB::table('activity_logs')->get();
            foreach ($logs as $log) {
                $actionLower = strtolower($log->action ?? '');
                $isHealth = str_contains($actionLower, 'online') || str_contains($actionLower, 'offline') || str_contains($actionLower, 'health');
                $isAgent = str_contains($actionLower, 'agent') && !$isHealth;

                if ($isHealth) {
                    DB::table('server_health_logs')->insert([
                        'logable_type' => $log->logable_type,
                        'logable_id'   => $log->logable_id,
                        'user_id'      => $log->user_id,
                        'user'         => $log->user,
                        'title'        => $log->action,
                        'details'      => $log->details,
                        'created_at'   => $log->created_at,
                        'updated_at'   => $log->updated_at,
                    ]);
                    DB::table('activity_logs')->where('id', $log->id)->delete();
                } elseif ($isAgent) {
                    DB::table('agent_logs')->insert([
                        'logable_type' => $log->logable_type,
                        'logable_id'   => $log->logable_id,
                        'user_id'      => $log->user_id,
                        'user'         => $log->user,
                        'action'       => $log->action,
                        'details'      => $log->details,
                        'created_at'   => $log->created_at,
                        'updated_at'   => $log->updated_at,
                    ]);
                    DB::table('activity_logs')->where('id', $log->id)->delete();
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('server_health_logs');
        Schema::dropIfExists('agent_logs');
    }
};
