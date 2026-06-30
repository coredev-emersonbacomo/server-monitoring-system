<?php

namespace App\Console\Commands;

use App\Models\ActionItem;
use App\Models\Client;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncActionItems extends Command
{
    protected $signature = 'actions:sync';

    protected $description = 'Detect server issues and clients without SecOps, sync ActionItem records';

    public function handle(): int
    {
        $issues = $this->detectIssues();
        $this->syncActions($issues);

        $created = ActionItem::where('created_at', '>=', now()->subSeconds(5))->count();
        $completed = ActionItem::where('status', 'completed')
            ->where('completed_at', '>=', now()->subSeconds(5))
            ->count();

        $this->info("Sync complete. {$created} issues detected, {$completed} resolved.");

        return self::SUCCESS;
    }

    private function detectIssues(): array
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

        $clientsWithoutSecOps = Client::whereDoesntHave('secopclients')
            ->select('id', 'name')
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

        return $issues;
    }

    private function syncActions(array $currentIssues): void
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

        ActionItem::where('status', 'open')
            ->chunk(100, function ($actions) use ($seenKeys) {
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
