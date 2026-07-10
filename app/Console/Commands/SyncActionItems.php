<?php

namespace App\Console\Commands;

use App\Enums\ServerHealth;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\Server;
use Illuminate\Console\Command;

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
        $servers = Server::with('client', 'latestUpdate')->get();

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

        foreach ($servers as $server) {
            if ($server->health === ServerHealth::Offline) {
                $issues[] = [
                    'action_type' => 'server_offline',
                    'severity' => 'critical',
                    'message' => "{$server->name} is offline",
                    'server_id' => $server->id,
                    'client_id' => $server->client_id,
                    'client_name' => $server->client->name,
                    'server_name' => $server->name,
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
