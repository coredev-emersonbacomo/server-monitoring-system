<?php

namespace App\Console\Commands;

use App\Jobs\MonitorServer;
use App\Models\ActionItem;
use App\Models\Client;
use App\NodeConfig\Models\NodeConfig;
use Illuminate\Console\Command;

class SystemMonitor extends Command
{
    protected $signature = 'system:monitor';

    protected $description = 'Evaluate all servers for alerts and sync action items (single entry point for scheduler)';

    public function handle(): int
    {
        $alertConfig = NodeConfig::where('slug', 'alerts')->where('enabled', true)->first();

        $servers = \App\Models\Server::pluck('id');
        foreach ($servers as $serverId) {
            MonitorServer::dispatch($serverId, $alertConfig?->id);
        }

        $this->syncNoSecOpsClients();

        $this->info("Dispatched " . $servers->count() . " server monitor jobs.");
        return self::SUCCESS;
    }

    private function syncNoSecOpsClients(): void
    {
        $clientsWithoutSecOps = Client::whereDoesntHave('secopclients')
            ->select('id', 'name')
            ->get();

        $seenKeys = [];

        foreach ($clientsWithoutSecOps as $client) {
            $key = 'no_secops-null-' . $client->id;
            $seenKeys[$key] = true;

            ActionItem::updateOrCreate(
                [
                    'action_type' => 'no_secops',
                    'server_id' => null,
                    'client_id' => $client->id,
                ],
                [
                    'message' => "{$client->name} has no SecOps assigned",
                    'severity' => 'warning',
                    'client_name' => $client->name,
                    'server_name' => null,
                ]
            );
        }

        ActionItem::where('status', 'open')
            ->where('action_type', 'no_secops')
            ->chunk(100, function ($actions) use ($seenKeys) {
                foreach ($actions as $action) {
                    $key = $action->action_type . '-null-' . $action->client_id;
                    if (!isset($seenKeys[$key])) {
                        $action->update([
                            'status' => 'completed',
                            'completed_at' => now(),
                        ]);
                    }
                }
            });
    }
}
