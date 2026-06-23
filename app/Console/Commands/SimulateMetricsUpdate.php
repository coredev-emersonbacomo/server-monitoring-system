<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Server;
use App\Models\ServerUpdate;

class SimulateMetricsUpdate extends Command
{
    protected $signature = 'server:update-metrics {--daemon}';
    protected $description = 'Simulates incoming daemon metric updates for all servers';

    public function handle()
    {
        if ($this->option('daemon')) {
            $this->info('Starting metrics simulator loop (Ctrl+C to stop)...');
            
            while (true) {
                $this->fireMetrics();
                sleep(5);
            }
        }

        $this->fireMetrics();
        $this->info('Injected single-shot metrics update.');
    }

    protected function fireMetrics()
    {
        $servers = Server::all();

        if ($servers->isEmpty()) {
            return;
        }

        foreach ($servers as $server) {
            ServerUpdate::create([
                'server_id' => $server->id,
                'cpu_usage' => rand(500, 9500) / 100,
                'memory_usage' => rand(3000, 8500) / 100,
                'storage' => rand(4000, 9000) / 100,
                'uptime' => rand(3600, 86400),
                'network_rbytes' => rand(10000, 999999),
                'network_tbytes' => rand(10000, 999999),
                'created_at' => now(),
            ]);
        }
    }
}