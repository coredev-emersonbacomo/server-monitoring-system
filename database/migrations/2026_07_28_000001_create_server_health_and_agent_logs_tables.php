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
        // Ensure type, title, and severity columns exist on activity_logs table
        if (Schema::hasTable('activity_logs')) {
            Schema::table('activity_logs', function (Blueprint $table) {
                if (!Schema::hasColumn('activity_logs', 'type')) {
                    $table->string('type')->default('activity')->index()->after('id');
                }
                if (!Schema::hasColumn('activity_logs', 'title')) {
                    $table->string('title')->nullable()->after('action');
                }
                if (!Schema::hasColumn('activity_logs', 'severity')) {
                    $table->string('severity')->nullable()->default('warning')->after('details');
                }
            });
        }

        // Migrate separate table logs (if any exist) back into activity_logs with appropriate type
        if (Schema::hasTable('server_health_logs')) {
            $healthLogs = DB::table('server_health_logs')->get();
            foreach ($healthLogs as $log) {
                DB::table('activity_logs')->insert([
                    'type'         => 'server_health',
                    'logable_type' => $log->logable_type,
                    'logable_id'   => $log->logable_id,
                    'user_id'      => $log->user_id,
                    'user'         => $log->user,
                    'action'       => $log->action ?? $log->title ?? 'Server Health',
                    'title'        => $log->title ?? $log->action ?? 'Server Health',
                    'details'      => $log->details,
                    'severity'     => $log->severity ?? 'warning',
                    'created_at'   => $log->created_at,
                    'updated_at'   => $log->updated_at,
                ]);
            }
            Schema::dropIfExists('server_health_logs');
        }

        if (Schema::hasTable('agent_logs')) {
            $agentLogs = DB::table('agent_logs')->get();
            foreach ($agentLogs as $log) {
                DB::table('activity_logs')->insert([
                    'type'         => 'agent',
                    'logable_type' => $log->logable_type,
                    'logable_id'   => $log->logable_id,
                    'user_id'      => $log->user_id,
                    'user'         => $log->user,
                    'action'       => $log->action,
                    'title'        => $log->action,
                    'details'      => $log->details,
                    'severity'     => 'info',
                    'created_at'   => $log->created_at,
                    'updated_at'   => $log->updated_at,
                ]);
            }
            Schema::dropIfExists('agent_logs');
        }

        // Categorize any uncategorized logs in activity_logs based on their action
        if (Schema::hasTable('activity_logs')) {
            $logs = DB::table('activity_logs')->whereNull('type')->orWhere('type', 'activity')->get();
            foreach ($logs as $log) {
                $actionLower = strtolower($log->action ?? '');
                $type = 'activity';

                if (str_contains($actionLower, 'deduction') || str_contains($actionLower, 'monthly charge') || str_contains($actionLower, 'reset cost')) {
                    $type = 'billing';
                } elseif (str_contains($actionLower, 'online') || str_contains($actionLower, 'offline') || str_contains($actionLower, 'health')) {
                    $type = 'server_health';
                } elseif (str_contains($actionLower, 'agent') && !str_contains($actionLower, 'offline') && !str_contains($actionLower, 'online')) {
                    $type = 'agent';
                }

                if ($type !== 'activity') {
                    DB::table('activity_logs')->where('id', $log->id)->update(['type' => $type]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('activity_logs')) {
            Schema::table('activity_logs', function (Blueprint $table) {
                if (Schema::hasColumn('activity_logs', 'type')) {
                    $table->dropColumn('type');
                }
                if (Schema::hasColumn('activity_logs', 'title')) {
                    $table->dropColumn('title');
                }
                if (Schema::hasColumn('activity_logs', 'severity')) {
                    $table->dropColumn('severity');
                }
            });
        }
    }
};
