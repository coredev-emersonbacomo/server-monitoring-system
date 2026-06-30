<?php

namespace App\Http\Controllers;

use App\Data\ActionItemData;
use App\Data\DashboardStatsData;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\Server;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): DashboardStatsData
    {
        // Total clients
        $totalClients = Client::count();

        // All servers with their client name
        $servers = Server::with('client')->get();
        $totalServers = $servers->count();

        // Latest server_updates per server (using a subquery for the most recent record)
        $latestUpdates = DB::table('server_updates as su')
            ->joinSub(
                DB::table('server_updates')
                    ->select('server_id', DB::raw('MAX(created_at) as max_created_at'))
                    ->groupBy('server_id'),
                'latest',
                function ($join) {
                    $join->on('su.server_id', '=', 'latest.server_id')
                         ->on('su.created_at', '=', 'latest.max_created_at');
                }
            )
            ->join('servers', 'su.server_id', '=', 'servers.id')
            ->join('clients', 'servers.client_id', '=', 'clients.id')
            ->select(
                'su.server_id',
                'servers.uuid as server_uuid',
                'servers.server_name as server_name',
                'clients.name as client_name',
                'su.cpu_usage',
                'su.memory_usage',
                'su.storage',
            )
            ->get();

        // Server status counts — derive from whether a server has a recent update
        // We consider a server "online" if it has a server_update in the last 5 minutes,
        // "warning" if between 5–15 min, "offline" if older or no updates.
        $onlineThreshold  = now()->subMinutes(5);
        $warningThreshold = now()->subMinutes(15);

        $statusCounts = DB::table('servers')
            ->leftJoinSub(
                DB::table('server_updates')
                    ->select('server_id', DB::raw('MAX(created_at) as last_seen'))
                    ->groupBy('server_id'),
                'lu',
                'servers.id', '=', 'lu.server_id'
            )
            ->selectRaw("
                SUM(CASE WHEN lu.last_seen >= ? THEN 1 ELSE 0 END) as online_count,
                SUM(CASE WHEN lu.last_seen < ? AND lu.last_seen >= ? THEN 1 ELSE 0 END) as warning_count,
                SUM(CASE WHEN lu.last_seen IS NULL OR lu.last_seen < ? THEN 1 ELSE 0 END) as offline_count
            ", [
                $onlineThreshold,
                $onlineThreshold,
                $warningThreshold,
                $warningThreshold,
            ])
            ->first();

        // Build top usage arrays (top 5 per metric)
        $buildRanking = fn (string $column) => $latestUpdates
            ->sortByDesc($column)
            ->take(5)
            ->values()
            ->map(fn ($row) => [
                'server_id'   => $row->server_id,
                'server_uuid' => $row->server_uuid,
                'server_name' => $row->server_name,
                'client_name' => $row->client_name,
                'value'       => round((float) $row->$column, 1),
            ])
            ->toArray();

        return new DashboardStatsData(
            total_clients:    $totalClients,
            total_servers:    $totalServers,
            online_count:     (int) ($statusCounts->online_count  ?? 0),
            warning_count:    (int) ($statusCounts->warning_count ?? 0),
            offline_count:    (int) ($statusCounts->offline_count ?? 0),
            top_usage_cpu:    $buildRanking('cpu_usage'),
            top_usage_memory: $buildRanking('memory_usage'),
            top_usage_disk:   $buildRanking('storage'),
        );
    }

    /** @return ActionItemData[] */
    public function actions(): array
    {
        $actions = ActionItem::with(['assignedUser', 'server', 'client'])
            ->where('status', '!=', 'completed')
            ->orderByRaw("CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 WHEN 'info' THEN 2 ELSE 3 END")
            ->orderBy('created_at', 'desc')
            ->get();

        return ActionItemData::collect($actions)->toArray();
    }

    public function claim(int $actionId): ActionItemData
    {
        $user = request()->user();
        $action = ActionItem::findOrFail($actionId);

        if ($action->assigned_to === $user->id) {
            $action->update(['assigned_to' => null, 'status' => 'open']);
        } else {
            $action->update(['assigned_to' => $user->id, 'status' => 'in_progress']);
        }

        $action->load(['assignedUser', 'server', 'client']);
        return ActionItemData::fromModel($action);
    }

    public function updateStatus(int $actionId): ActionItemData
    {
        $data = request()->validate([
            'status' => 'required|in:open,in_progress,completed',
        ]);

        $action = ActionItem::findOrFail($actionId);

        $updates = ['status' => $data['status']];
        if ($data['status'] === 'completed') {
            $updates['completed_at'] = now();
        }
        $action->update($updates);

        $action->load(['assignedUser', 'server', 'client']);
        return ActionItemData::fromModel($action);
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

