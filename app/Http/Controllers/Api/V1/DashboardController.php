<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\ActionItemData;
use App\Data\DashboardStatsData;
use App\Enums\ActionItemSeverity;
use App\Enums\ServerHealth;
use App\Enums\ServerStatus;
use App\Http\Controllers\Controller;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\CustomActivityLog;
use App\Models\Server;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): DashboardStatsData
    {
        $totalClients = Client::count();

        $servers = Server::with(['client', 'latestUpdate', 'agent', 'provisionTokens'])->get();
        $totalServers = $servers->count();

        $onlineCount = 0;
        $offlineCount = 0;
        $pendingInstallationCount = 0;
        $waitingForInstallationCount = 0;
        $pendingDeletionCount = 0;

        $latestUpdates = collect();

        foreach ($servers as $server) {
            $server->checkTokenExpiration();

            $isArchived = $server->trashed() || $server->record_status === 'archived' || $server->status === 'archived';
            if ($isArchived) {
                continue;
            }

            $agent = $server->agent;
            $agentDeleted = $agent && $agent->registered_at ? (bool) $server->agent_deleted : false;

            if ($agentDeleted) {
                $pendingDeletionCount++;
                continue;
            }

            if ($server->status === ServerStatus::WaitingForInstallation->value) {
                $waitingForInstallationCount++;
                continue;
            }

            if (! $agent || ! $agent->registered_at || in_array($server->status, [
                ServerStatus::PendingInstallation->value,
                ServerStatus::WaitingForFirstHeartbeat->value,
            ])) {
                $pendingInstallationCount++;
                continue;
            }

            $health = $server->health;

            match ($health) {
                ServerHealth::Online => $onlineCount++,
                ServerHealth::Offline => $offlineCount++,
            };

            if ($server->latestUpdate) {
                $latestUpdates->push((object) [
                    'server_id' => $server->id,
                    'server_uuid' => $server->uuid,
                    'server_name' => $server->name,
                    'client_name' => $server->client->name,
                    'cpu_usage' => $server->latestUpdate->cpu_usage,
                    'memory_usage' => $server->latestUpdate->memory_usage,
                    'storage' => $server->latestUpdate->storage,
                ]);
            }
        }

        $buildRanking = fn (string $column) => $latestUpdates
            ->sortByDesc($column)
            ->take(5)
            ->values()
            ->map(fn ($row) => [
                'server_id' => $row->server_id,
                'server_uuid' => $row->server_uuid,
                'server_name' => $row->server_name,
                'client_name' => $row->client_name,
                'value' => round((float) $row->$column, 1),
            ])
            ->toArray();

        $totalUsers = User::count();

        return new DashboardStatsData(
            total_users: $totalUsers,
            total_clients: $totalClients,
            total_servers: $totalServers,
            online_count: $onlineCount,
            offline_count: $offlineCount,
            pending_installation_count: $pendingInstallationCount,
            waiting_for_installation_count: $waitingForInstallationCount,
            pending_deletion_count: $pendingDeletionCount,
            top_usage_cpu: $buildRanking('cpu_usage'),
            top_usage_memory: $buildRanking('memory_usage'),
            top_usage_disk: $buildRanking('storage'),
        );
    }

    /** @return ActionItemData[] */
    public function actions(): array
    {
        $actions = ActionItem::with(['assignedUser', 'server', 'client'])
            ->where('status', '!=', 'completed')
            ->where(function ($q) {
                // Keep action items that have no server (e.g. client-level) OR
                // that reference an existing server (excludes orphaned items from deleted servers).
                $q->whereNull('server_id')
                    ->orWhereHas('server');
            })
            ->get()
            ->sort(function ($a, $b) {
                $severityOrder = [
                    ActionItemSeverity::Critical->value => 0,
                    ActionItemSeverity::Warning->value => 1,
                    ActionItemSeverity::Info->value => 2,
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

        CustomActivityLog::create([
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
            $message = 'User '.request()->user()->username." completed action item #{$action->id}";
        } else {
            $logAction = 'update action status';
            $message = "Changed action item #{$action->id} status from '{$oldStatus}' to '{$data['status']}'";
        }

        $action->update($updates);

        $actor = request()->user();

        CustomActivityLog::create([
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
            'unit' => 'required|in:minute,hour,day,week,month',
            'metric' => 'required|in:cpu,memory,disk',
            'before' => 'nullable|numeric',
            'scope' => 'nullable|in:all,avg,server',
            'server_uuid' => 'nullable|string',
        ]);

        $unit = $validated['unit'];
        $metric = $validated['metric'];
        $scope = $validated['scope'] ?? 'all';

        // Map API unit names to TimescaleDB agg tables and window sizes
        $config = [
            'minute' => ['table' => 'server_updates_agg_minute', 'seconds' => 3600],
            'hour' => ['table' => 'server_updates_agg_hour',   'seconds' => 86400],
            'day' => ['table' => 'server_updates_agg_day',    'seconds' => 604800],
            'week' => ['table' => 'server_updates_agg_week',   'seconds' => 2419200],
            'month' => ['table' => 'server_updates_agg_month',  'seconds' => 31104000],
        ];

        $cfg = $config[$unit];
        $table = $cfg['table'];

        $servers = Server::with('client', 'latestUpdate')->get();
        $serverIds = $servers->pluck('id');

        $endTime = isset($validated['before'])
            ? Carbon::createFromTimestampMs((int) $validated['before'])
                ->setTimezone(config('app.timezone'))
            : now();

        // Anchor to latest agg record so chart always has data
        if (! isset($validated['before'])) {
            try {
                $latestRecord = DB::table($table)
                    ->whereIn('server_id', $serverIds)
                    ->max('timestamp');
                if ($latestRecord) {
                    $endTime = Carbon::createFromTimestampMs(
                        $this->parseAggTimestamp($latestRecord)
                    )->addSecond()->setTimezone(config('app.timezone'));
                }
            } catch (\Throwable) {
                // Agg view missing/unusable — fall back to now()
            }
        }

        $startTime = $endTime->copy()->subSeconds($cfg['seconds']);

        $empty = [
            'unit' => $unit,
            'metric' => $metric,
            'scope' => $scope,
            'series' => [],
            'top' => [],
            'nextCursor' => null,
        ];

        if ($serverIds->isEmpty()) {
            return $empty;
        }

        // ── Single/multi-server comparison drilldown ────────────────────────
        if ($scope === 'server') {
            $uuids = $validated['server_uuid'] ?? '';
            $targets = $uuids !== ''
                ? Server::whereIn('uuid', explode(',', $uuids))->get()
                : collect();

            if ($targets->isEmpty()) {
                return $empty;
            }

            $targetIds = $targets->pluck('id');

            $rows = $this->aggQueryWithRefresh(
                fn () => DB::table($table)
                    ->select('server_id', 'timestamp', $metric)
                    ->whereIn('server_id', $targetIds)
                    ->where('timestamp', '>=', $startTime)
                    ->where('timestamp', '<', $endTime)
                    ->orderBy('server_id')
                    ->orderBy('timestamp')
                    ->get(),
                $table
            );

            $seriesMap = [];
            foreach ($rows as $row) {
                $epochMs = $this->parseAggTimestamp($row->timestamp);
                $seriesMap[$row->server_id][] = [
                    'timestamp' => $epochMs,
                    'value' => round((float) $row->{$metric}, 1),
                ];
            }

            $series = [];
            foreach ($targets as $target) {
                $series[] = [
                    'server_uuid' => $target->uuid,
                    'server_name' => $target->name,
                    'client_name' => $target->client?->name ?? '',
                    'points' => $seriesMap[$target->id] ?? [],
                ];
            }

            $hasOlderData = DB::table($table)
                ->whereIn('server_id', $targetIds)
                ->where('timestamp', '<', $startTime)
                ->exists();

            return [
                'unit' => $unit,
                'metric' => $metric,
                'scope' => $scope,
                'series' => $series,
                'top' => [],
                'nextCursor' => $hasOlderData ? $startTime->getPreciseTimestamp(3) : null,
            ];
        }

        // ── Aggregated overview: one averaged series across all servers ──────
        if ($scope === 'avg') {
            $rows = $this->aggQueryWithRefresh(
                fn () => DB::table($table)
                    ->select('timestamp', DB::raw('AVG("'.$metric.'") AS value'))
                    ->whereIn('server_id', $serverIds)
                    ->where('timestamp', '>=', $startTime)
                    ->where('timestamp', '<', $endTime)
                    ->groupBy('timestamp')
                    ->orderBy('timestamp')
                    ->get(),
                $table
            );

            $points = [];
            foreach ($rows as $row) {
                $epochMs = $this->parseAggTimestamp($row->timestamp);
                $points[] = [
                    'timestamp' => $epochMs,
                    'value' => round((float) $row->value, 1),
                ];
            }

            $hasOlderData = DB::table($table)
                ->whereIn('server_id', $serverIds)
                ->where('timestamp', '<', $startTime)
                ->exists();

            return [
                'unit' => $unit,
                'metric' => $metric,
                'scope' => $scope,
                'series' => [[
                    'server_uuid' => 'avg',
                    'server_name' => 'All Servers',
                    'client_name' => '',
                    'points' => $points,
                ]],
                'top' => [],
                'nextCursor' => $hasOlderData ? $startTime->getPreciseTimestamp(3) : null,
            ];
        }

        // ── scope=all: every server as its own line ──────────────────────────
        $rows = $this->aggQueryWithRefresh(
            fn () => DB::table($table)
                ->select('server_id', 'timestamp', $metric)
                ->whereIn('server_id', $serverIds)
                ->where('timestamp', '>=', $startTime)
                ->where('timestamp', '<', $endTime)
                ->orderBy('server_id')
                ->orderBy('timestamp')
                ->get(),
            $table
        );

        // Group rows by server, parse timestamps with UTC fix (same as ServerController)
        $seriesMap = [];
        foreach ($rows as $row) {
            $epochMs = $this->parseAggTimestamp($row->timestamp);
            $seriesMap[$row->server_id][] = [
                'timestamp' => $epochMs,
                'value' => round((float) $row->{$metric}, 1),
            ];
        }

        $series = [];
        $top = [];

        foreach ($servers as $server) {
            if (! $server->latestUpdate) {
                continue;
            }

            $points = $seriesMap[$server->id] ?? [];

            $series[] = [
                'server_uuid' => $server->uuid,
                'server_name' => $server->name,
                'client_name' => $server->client->name,
                'points' => $points,
            ];

            $columnMap = ['cpu' => 'cpu_usage', 'memory' => 'memory_usage', 'disk' => 'disk_usage'];
            $latestValue = (float) $server->latestUpdate->{$columnMap[$metric]};
            $top[] = [
                'server_uuid' => $server->uuid,
                'server_name' => $server->name,
                'client_name' => $server->client->name,
                'value' => round($latestValue, 1),
            ];
        }

        usort($top, fn ($a, $b) => $b['value'] <=> $a['value']);

        $hasOlderData = DB::table($table)
            ->whereIn('server_id', $serverIds)
            ->where('timestamp', '<', $startTime)
            ->exists();

        return [
            'unit' => $unit,
            'metric' => $metric,
            'scope' => $scope,
            'series' => $series,
            'top' => $top,
            'nextCursor' => $hasOlderData ? $startTime->getPreciseTimestamp(3) : null,
        ];
    }

    /**
     * Convert an agg-table timestamptz string (e.g. "2026-08-05 19:34:00+08")
     * to epoch milliseconds, honoring the embedded offset. The previous
     * substr(…, 0, 19) + parse('UTC') dropped the offset, shifting the
     * instant by the DB session timezone (8h ahead here).
     */
    private function parseAggTimestamp(string $raw): int
    {
        return Carbon::parse($raw)->getPreciseTimestamp(3);
    }

    /**
     * Run an agg-table query, refreshing the materialized view once if it has
     * not been populated yet.
     */
    private function aggQueryWithRefresh(\Closure $run, string $table)
    {
        try {
            return $run();
        } catch (\Throwable $e) {
            if (str_contains($e->getMessage(), 'has not been populated')) {
                DB::statement("REFRESH MATERIALIZED VIEW {$table}");

                return $run();
            }
            throw $e;
        }
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
