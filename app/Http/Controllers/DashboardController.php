<?php

namespace App\Http\Controllers;

use App\Data\ActionItemData;
use App\Data\DashboardStatsData;
use App\Models\ActionItem;
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

    public function actions(): JsonResponse
    {
        $user = request()->user();
        $isAdmin = $user->role_id === 1;

        $issues = $this->detectIssues($user, $isAdmin);
        $this->syncActions($issues, $isAdmin, $user);

        $actions = ActionItem::with('assignedUser')
            ->where('status', '!=', 'completed')
            ->orderByRaw("FIELD(severity, 'critical', 'warning', 'info')")
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(ActionItemData::collection($actions));
    }

    public function claim(int $actionId): JsonResponse
    {
        $user = request()->user();
        $action = ActionItem::findOrFail($actionId);

        if ($action->assigned_to === $user->id) {
            $action->update(['assigned_to' => null, 'status' => 'open']);
        } else {
            $action->update(['assigned_to' => $user->id, 'status' => 'in_progress']);
        }

        $action->load('assignedUser');
        return response()->json(ActionItemData::fromModel($action));
    }

    public function updateStatus(int $actionId): JsonResponse
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

        $action->load('assignedUser');
        return response()->json(ActionItemData::fromModel($action));
    }

    public function completed(): JsonResponse
    {
        $actions = ActionItem::with('assignedUser')
            ->where('status', 'completed')
            ->orderBy('completed_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json(ActionItemData::collection($actions));
    }

    /**
     * Detect current issues based on user role.
     */
    private function detectIssues($user, bool $isAdmin): array
    {
        $onlineThreshold  = now()->subMinutes(5);
        $warningThreshold = now()->subMinutes(15);

        $serverStatus = DB::table('servers')
            ->leftJoinSub(
                DB::table('server_updates')
                    ->select('server_id', DB::raw('MAX(created_at) as last_seen'))
                    ->groupBy('server_id'),
                'lu',
                'servers.id', '=', 'lu.server_id'
            )
            ->join('clients', 'servers.client_id', '=', 'clients.id')
            ->select(
                'servers.id as server_id',
                'servers.server_name',
                'servers.client_id',
                'clients.name as client_name',
                'lu.last_seen',
            )
            ->selectRaw("
                CASE
                    WHEN lu.last_seen >= ? THEN 'online'
                    WHEN lu.last_seen < ? AND lu.last_seen >= ? THEN 'warning'
                    ELSE 'offline'
                END as status
            ", [$onlineThreshold, $onlineThreshold, $warningThreshold])
            ->get();

        $issues = [];

        if ($isAdmin) {
            $clientsWithoutSecOps = DB::table('clients')
                ->leftJoin('sec_ops', 'clients.id', '=', 'sec_ops.client_id')
                ->whereNull('sec_ops.client_id')
                ->select('clients.id', 'clients.name')
                ->get();

            foreach ($clientsWithoutSecOps as $client) {
                $issues[] = [
                    'action_type' => 'no_secops',
                    'severity' => 'warning',
                    'message' => "{$client->name} has no SecOps assigned",
                    'server_id' => null,
                    'client_id' => $client->id,
                    'client_name' => $client->name,
                    'server_name' => null,
                ];
            }

            foreach ($serverStatus as $server) {
                if ($server->status === 'offline') {
                    $issues[] = [
                        'action_type' => 'server_offline',
                        'severity' => 'critical',
                        'message' => "{$server->server_name} is offline",
                        'server_id' => $server->server_id,
                        'client_id' => $server->client_id,
                        'client_name' => $server->client_name,
                        'server_name' => $server->server_name,
                    ];
                } elseif ($server->status === 'warning') {
                    $issues[] = [
                        'action_type' => 'server_warning',
                        'severity' => 'warning',
                        'message' => "{$server->server_name} has not reported in",
                        'server_id' => $server->server_id,
                        'client_id' => $server->client_id,
                        'client_name' => $server->client_name,
                        'server_name' => $server->server_name,
                    ];
                }
            }
        } else {
            $assignedClientIds = DB::table('sec_ops')
                ->where('user_id', $user->id)
                ->pluck('client_id');

            foreach ($serverStatus as $server) {
                if (!$assignedClientIds->contains($server->client_id)) {
                    continue;
                }
                if ($server->status === 'offline') {
                    $issues[] = [
                        'action_type' => 'server_offline',
                        'severity' => 'critical',
                        'message' => "{$server->server_name} is offline",
                        'server_id' => $server->server_id,
                        'client_id' => $server->client_id,
                        'client_name' => $server->client_name,
                        'server_name' => $server->server_name,
                    ];
                } elseif ($server->status === 'warning') {
                    $issues[] = [
                        'action_type' => 'server_warning',
                        'severity' => 'warning',
                        'message' => "{$server->server_name} has not reported in",
                        'server_id' => $server->server_id,
                        'client_id' => $server->client_id,
                        'client_name' => $server->client_name,
                        'server_name' => $server->server_name,
                    ];
                }
            }
        }

        return $issues;
    }

    private function syncActions(array $currentIssues, bool $isAdmin, $user): void
    {
        $seenKeys = [];

        foreach ($currentIssues as $issue) {
            $key = $issue['action_type'] . '-' . ($issue['server_id'] ?? 'null') . '-' . ($issue['client_id'] ?? 'null');
            $seenKeys[$key] = true;

            ActionItem::updateOrCreate(
                [
                    'action_type' => $issue['action_type'],
                    'server_id'   => $issue['server_id'],
                    'client_id'   => $issue['client_id'],
                ],
                [
                    'message'     => $issue['message'],
                    'severity'    => $issue['severity'],
                    'client_name' => $issue['client_name'],
                    'server_name' => $issue['server_name'],
                ]
            );
        }

        $query = ActionItem::where('status', 'open');

        if (!$isAdmin && $user) {
            $assignedClientIds = DB::table('sec_ops')
                ->where('user_id', $user->id)
                ->pluck('client_id');
            $query->where(function ($q) use ($assignedClientIds) {
                $q->whereIn('client_id', $assignedClientIds)
                  ->orWhereNull('client_id');
            });
        }

        $query->chunk(100, function ($actions) use ($seenKeys) {
            foreach ($actions as $action) {
                $key = $action->action_type . '-' . ($action->server_id ?? 'null') . '-' . ($action->client_id ?? 'null');
                if (!isset($seenKeys[$key])) {
                    $action->update([
                        'status'       => 'completed',
                        'completed_at' => now(),
                    ]);
                }
            }
        });
    }
}

