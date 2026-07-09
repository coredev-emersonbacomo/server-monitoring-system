<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\ActionItemData;
use App\Data\DashboardStatsData;
use App\Enums\ActionItemSeverity;
use App\Enums\ServerHealth;
use App\Http\Controllers\Controller;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\Server;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): DashboardStatsData
    {
        $totalClients = Client::count();

        $servers = Server::with('client', 'latestUpdate')->get();
        $totalServers = $servers->count();

        $onlineThreshold  = now()->subMinutes(5);
        $warningThreshold = now()->subMinutes(15);

        $onlineCount = 0;
        $warningCount = 0;
        $offlineCount = 0;

        $latestUpdates = collect();

        foreach ($servers as $server) {
            $lastSeen = $server->latestUpdate?->created_at;
            $health = Server::computeHealth($lastSeen, $onlineThreshold, $warningThreshold);

            match ($health) {
                ServerHealth::Online  => $onlineCount++,
                ServerHealth::Offline => $offlineCount++,
            };

            if ($server->latestUpdate) {
                $latestUpdates->push((object) [
                    'server_id'   => $server->id,
                    'server_uuid' => $server->uuid,
                    'server_name' => $server->server_name,
                    'client_name' => $server->client->name,
                    'cpu_usage'   => $server->latestUpdate->cpu_usage,
                    'memory_usage' => $server->latestUpdate->memory_usage,
                    'storage'     => $server->latestUpdate->storage,
                ]);
            }
        }

        $buildRanking = fn(string $column) => $latestUpdates
            ->sortByDesc($column)
            ->take(5)
            ->values()
            ->map(fn($row) => [
                'server_id'   => $row->server_id,
                'server_uuid' => $row->server_uuid,
                'server_name' => $row->server_name,
                'client_name' => $row->client_name,
                'value'       => round((float) $row->$column, 1),
            ])
            ->toArray();

        $totalUsers = User::count();

        return new DashboardStatsData(
            total_users:      $totalUsers,
            total_clients:    $totalClients,
            total_servers:    $totalServers,
            online_count:     $onlineCount,
            warning_count:    $warningCount,
            offline_count:    $offlineCount,
            top_usage_cpu:    $buildRanking('cpu_usage'),
            top_usage_memory: $buildRanking('memory_usage'),
            top_usage_disk: $buildRanking('storage'),
        );
    }

    /** @return ActionItemData[] */
    public function actions(): array
    {
        $actions = ActionItem::with(['assignedUser', 'server', 'client'])
            ->where('status', '!=', 'completed')
            ->get()
            ->sort(function ($a, $b) {
                $severityOrder = [
                    ActionItemSeverity::Critical->value => 0,
                    ActionItemSeverity::Warning->value  => 1,
                    ActionItemSeverity::Info->value     => 2,
                ];

                $aOrder = $severityOrder[$a->severity->value] ?? 3;
                $bOrder = $severityOrder[$b->severity->value] ?? 3;

                return $aOrder <=> $bOrder ?: $b->created_at->timestamp <=> $a->created_at->timestamp;
            })
            ->values();

        return ActionItemData::collect($actions)->toArray();
    }

    public function claim(int $actionId): ActionItemData
    {
        $user = request()->user();
        $action = ActionItem::findOrFail($actionId);

        $requestedStatus = request()->get('status');

        if ($requestedStatus === 'completed') {
            $action->update([
                'assigned_to' => $user->id,
                'status' => 'completed',
                'completed_at' => now(),
            ]);
            $logAction = 'complete action item';
            $message = "User {$user->username} completed action item #{$action->id}";
        } else {
            $isUnclaiming = $action->assigned_to === $user->id;

            if ($isUnclaiming) {
                $action->update(['assigned_to' => null, 'status' => 'open']);
                $logAction = 'unclaim action item';
                $message = "User {$user->username} unclaimed action item #{$action->id} (Status reset to open)";
            } else {
                $action->update(['assigned_to' => $user->id, 'status' => 'in_progress']);
                $logAction = 'claim action item';
                $message = "User {$user->username} claimed action item #{$action->id} (Status updated to in_progress)";
            }
        }

        \App\Models\CustomActivityLog::create([
            'logable_type' => ActionItem::class,
            'logable_id' => (string) $action->id,
            'user_id' => $user ? $user->id : null,
            'user' => $user ? "{$user->first_name} {$user->last_name}" : 'System',
            'action' => $logAction,
            'details' => [
                'message' => $message,
                'action_item_id' => $action->id,
                'status' => $action->status,
            ],
        ]);

        $action->load(['assignedUser', 'server', 'client']);
        return ActionItemData::fromModel($action);
    }

    public function updateStatus(int $actionId): ActionItemData
    {
        $data = request()->validate([
            'status' => 'required|in:open,in_progress,completed',
        ]);

        $action = ActionItem::findOrFail($actionId);
        $oldStatus = $action->status;

        $updates = ['status' => $data['status']];
        if ($data['status'] === 'completed') {
            $updates['completed_at'] = now();
            $logAction = 'complete action item';
            $message = "User " . request()->user()->username . " completed action item #{$action->id}";
        } else {
            $logAction = 'update action status';
            $message = "Changed action item #{$action->id} status from '{$oldStatus}' to '{$data['status']}'";
        }

        $action->update($updates);

        $actor = request()->user();

        \App\Models\CustomActivityLog::create([
            'logable_type' => ActionItem::class,
            'logable_id' => (string) $action->id,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => $logAction,
            'details' => [
                'message' => $message,
                'action_item_id' => $action->id,
                'old_status' => $oldStatus,
                'new_status' => $data['status'],
            ],
        ]);

        $action->load(['assignedUser', 'server', 'client']);
        return ActionItemData::fromModel($action);
    }

    public function usage(Request $request): array
    {
        $validated = $request->validate([
            'unit'   => 'required|in:second,minute,hour,day,week,month',
            'metric' => 'required|in:cpu,memory,disk',
            'before' => 'nullable|numeric',
        ]);

        $unit   = $validated['unit'];
        $metric = $validated['metric'];

        $columnMap = [
            'cpu'    => 'cpu_usage',
            'memory' => 'memory_usage',
            'disk'   => 'disk_usage',
        ];

        $config = [
            'second' => ['seconds' => 60,       'divisor' => 1],
            'minute' => ['seconds' => 3600,     'divisor' => 60],
            'hour'   => ['seconds' => 86400,    'divisor' => 3600],
            'day'    => ['seconds' => 604800,   'divisor' => 86400],
            'week'   => ['seconds' => 2419200,  'divisor' => 604800],
            'month'  => ['seconds' => 31104000, 'divisor' => 2592000],
        ];

        $column    = $columnMap[$metric];
        $cfg       = $config[$unit];
        $divisor   = $cfg['divisor'];

        $servers = Server::with('client', 'latestUpdate')->get();
        $serverIds = $servers->pluck('id');

        $endTime = isset($validated['before'])
            ? \Illuminate\Support\Carbon::createFromTimestampMs((int) $validated['before'])
            : now();

        // Anchor the initial window at the latest record so the chart always
        // has data to draw; subsequent pages use normal cursor pagination
        if (!isset($validated['before'])) {
            $latestRecord = DB::table('server_updates')
                ->whereIn('server_id', $serverIds)
                ->max('created_at');
            if ($latestRecord) {
                $endTime = \Illuminate\Support\Carbon::parse($latestRecord)->addSecond();
            }
        }

        $startTime = $endTime->copy()->subSeconds($cfg['seconds']);

        if ($serverIds->isEmpty()) {
            return [
                'unit'       => $unit,
                'metric'     => $metric,
                'series'     => [],
                'top'        => [],
                'nextCursor' => null,
            ];
        }

        $driver    = DB::connection()->getDriverName();
        $epochExpr = $driver === 'mysql'
            ? 'UNIX_TIMESTAMP(created_at)'
            : 'EXTRACT(EPOCH FROM created_at)';

        $bucketExpr = "FLOOR({$epochExpr} / {$divisor}) * {$divisor} * 1000";

        $rows = DB::table('server_updates')
            ->select(
                'server_id',
                DB::raw("{$bucketExpr} AS bucket_ts"),
                DB::raw("AVG({$column}) AS avg_value"),
            )
            ->whereIn('server_id', $serverIds)
            ->where('created_at', '>=', $startTime)
            ->where('created_at', '<', $endTime)
            ->groupBy('server_id', DB::raw($bucketExpr))
            ->orderBy('server_id')
            ->orderBy('bucket_ts')
            ->get();

        $seriesMap = [];
        foreach ($rows as $row) {
            $seriesMap[$row->server_id][] = [
                'timestamp' => (int) $row->bucket_ts,
                'value'     => round((float) $row->avg_value, 1),
            ];
        }

        // Generate complete bucket timestamps for the time window
        $startBucket = (int) (floor($startTime->timestamp / $divisor) * $divisor);
        $endBucket   = (int) (floor($endTime->timestamp / $divisor) * $divisor);
        $buckets = [];
        for ($ts = $startBucket; $ts <= $endBucket; $ts += $divisor) {
            $buckets[] = $ts * 1000;
        }

        $series = [];
        $top    = [];

        foreach ($servers as $server) {
            if (!$server->latestUpdate) {
                continue;
            }

            $raw = $seriesMap[$server->id] ?? [];
            $indexed = [];
            foreach ($raw as $p) {
                $indexed[$p['timestamp']] = $p['value'];
            }

            $points = [];
            foreach ($buckets as $bt) {
                $points[] = [
                    'timestamp' => $bt,
                    'value'     => $indexed[$bt] ?? null,
                ];
            }

            $series[] = [
                'server_uuid' => $server->uuid,
                'server_name' => $server->server_name,
                'client_name' => $server->client->name,
                'points'      => $points,
            ];

            $latestValue = (float) $server->latestUpdate->{$column};
            $top[] = [
                'server_uuid' => $server->uuid,
                'server_name' => $server->server_name,
                'client_name' => $server->client->name,
                'value'       => round($latestValue, 1),
            ];
        }

        usort($top, fn ($a, $b) => $b['value'] <=> $a['value']);

        $hasOlderData = DB::table('server_updates')
            ->whereIn('server_id', $serverIds)
            ->where('created_at', '<', $startTime)
            ->exists();

        return [
            'unit'       => $unit,
            'metric'     => $metric,
            'series'     => $series,
            'top'        => $top,
            'nextCursor' => $hasOlderData ? $startTime->getPreciseTimestamp(3) : null,
        ];
    }

    /** @return ActionItemData[] */
    public function completed(): array
    {
        $actions = ActionItem::with(['assignedUser', 'server', 'client'])
            ->where('status', 'completed')
            ->orderBy('completed_at', 'desc')
            ->limit(50)
            ->get();

        return ActionItemData::collect($actions)->toArray();
    }
}
