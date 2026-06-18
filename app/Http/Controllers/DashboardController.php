<?php

namespace App\Http\Controllers;

use App\Data\DashboardStatsData;
use App\Models\Client;
use App\Models\Server;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
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
                'server_name' => $row->server_name,
                'client_name' => $row->client_name,
                'value'       => round((float) $row->$column, 1),
            ])
            ->toArray();

        $data = new DashboardStatsData(
            total_clients:    $totalClients,
            total_servers:    $totalServers,
            online_count:     (int) ($statusCounts->online_count  ?? 0),
            warning_count:    (int) ($statusCounts->warning_count ?? 0),
            offline_count:    (int) ($statusCounts->offline_count ?? 0),
            top_usage_cpu:    $buildRanking('cpu_usage'),
            top_usage_memory: $buildRanking('memory_usage'),
            top_usage_disk:   $buildRanking('storage'),
        );

        return response()->json($data);
    }
}
