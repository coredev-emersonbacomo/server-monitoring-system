<?php

namespace App\Http\Controllers;

use App\Data\ActionItemData;
use App\Data\DashboardStatsData;
use App\Enums\ActionItemSeverity;
use App\Enums\ServerHealth;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\Server;

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
                ServerHealth::Warning => $warningCount++,
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

        return new DashboardStatsData(
            total_clients: $totalClients,
            total_servers: $totalServers,
            online_count: $onlineCount,
            warning_count: $warningCount,
            offline_count: $offlineCount,
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
