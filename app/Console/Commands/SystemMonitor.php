<?php

namespace App\Console\Commands;

use App\Events\SystemTelemetryEvent;
use App\Jobs\MonitorServer;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\Server;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class SystemMonitor extends Command
{
    protected $signature = 'system:monitor';

    protected $description = 'Evaluate all servers for alerts and sync action items (single entry point for scheduler)';

    public function handle(): int
    {
        $servers = Server::whereHas('agent')->get();
        foreach ($servers as $server) {
            $server->checkTokenExpiration();
            MonitorServer::dispatchSync($server->uuid);
        }

        $this->syncNoSecOpsClients();

        $sweepAt = microtime(true);
        Cache::put('last_monitor_sweep_at', $sweepAt, now()->addMinutes(10));

        $offlineServers = Server::where('servers.status', 'offline')
            ->select('servers.uuid', 'servers.name', 'clients.name as client_name', 'servers.went_offline_at')
            ->join('clients', 'clients.id', '=', 'servers.client_id')
            ->get()
            ->toArray();

        SystemTelemetryEvent::emit('system_monitor_sweep', [
            'server_count' => $servers->count(),
            'swept_at' => $sweepAt,
            'offline_servers' => $offlineServers,
        ]);

        $this->info('Dispatched '.$servers->count().' server monitor jobs.');

        return self::SUCCESS;
    }

    private function syncNoSecOpsClients(): void
    {
        $clientsWithoutSecOps = Client::whereDoesntHave('secopclients')
            ->select('id', 'name')
            ->get();

        $seenKeys = [];

        foreach ($clientsWithoutSecOps as $client) {
            $key = 'no_secops-null-'.$client->id;
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
                    $key = $action->action_type.'-null-'.$action->client_id;
                    if (! isset($seenKeys[$key])) {
                        if ($action->assigned_to) {
                            $action->update([
                                'status' => 'completed',
                                'completed_at' => now(),
                            ]);
                        } else {
                            $action->delete();
                        }
                    }
                }
            });
    }
}
