<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Server;
use App\Models\ServerUpdate;
use App\Events\ServerStatsUpdated;

class SimulateMetricsUpdate extends Command
{
    protected $signature = 'server:update-metrics {--daemon}';
    protected $description = 'Simulates incoming daemon metric updates and hardware profiles for all servers';

    public function handle()
    {
        if ($this->option('daemon')) {
            $this->info('Starting metrics simulator loop (Ctrl+C to stop)...');
            
            while (true) {
                $this->fireMetrics();
                sleep(1);
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

        $statuses = ['online', 'offline'];
        $operatingSystems = ['Ubuntu 22.04 LTS', 'Debian 12', 'CentOS Stream 9', 'Windows Server 2022'];
        $cpuOptions = [2, 4, 8, 16, 32];
        $ramOptions = [4, 8, 16, 32, 64, 128];

        foreach ($servers as $server) {
            $randomStatus = $statuses[array_rand($statuses)];

            if ($randomStatus === 'offline') {
                $server->update([
                    'record_status' => 'offline',
                ]);

                continue;
            }

            $server->update([
                'record_status' => 'online',
                'cpu_cores' => $server->cpu_cores ?? $cpuOptions[array_rand($cpuOptions)],
                'ram' => $server->ram ?? $ramOptions[array_rand($ramOptions)],
                'operating_system' => $server->operating_system ?? $operatingSystems[array_rand($operatingSystems)],
            ]);

            $update = ServerUpdate::create([
                'server_id' => $server->id,
                'cpu_usage' => rand(50, 950) / 100,
                'memory_usage' => rand(30, 850) / 100,
                'storage' => rand(40, 900) / 100,
                'uptime' => rand(360, 8640),
                'network_rbytes' => rand(1, 99999),
                'network_tbytes' => rand(1, 99999),
                'created_at' => now(),
            ]);

            ServerStatsUpdated::dispatch(
                $server->id,
                [
                    'timestamp' => $update->created_at->getPreciseTimestamp(3),
                    'cpu'       => round((float) $update->cpu_usage, 1),
                    'memory'    => round((float) $update->memory_usage, 1),
                    'netIn'     => 0,
                    'netOut'    => 0,
                    'disk'      => round((float) $update->storage, 1),
                ],
            );
        }
    }
}