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
            $this->runDaemon();
            return 0;
        }

        $this->fireMetrics();
        $this->info('Injected single-shot metrics update.');
    }

    protected function runDaemon(): void
    {
        $servers = Server::all();

        if ($servers->isEmpty()) {
            $this->warn('No servers found in database.');
            return;
        }

        $batchSize = min($servers->count(), 3);
        $this->info("Starting metrics simulator for {$servers->count()} servers (Ctrl+C to stop)...");

        while (true) {
            $start = microtime(true);
            $broadcastCount = 0;

            foreach ($servers as $server) {
                try {
                    $this->updateServer($server, $broadcastCount < $batchSize);
                    $broadcastCount++;
                } catch (\Throwable $e) {
                    $this->error("  [{$server->server_name}] Error: " . $e->getMessage());
                }
            }

            $elapsed = (microtime(true) - $start) * 1000;
            $this->line("  Batch: {$servers->count()} servers (broadcast {$batchSize}) in {$elapsed}ms");

            $sleep = max(0, 1_000_000 - (int) ($elapsed * 1000));
            usleep($sleep);
        }
    }

    protected function updateServer(Server $server, bool $shouldBroadcast = true): void
    {
        $update = ServerUpdate::create([
            'server_id' => $server->id,
            'cpu_usage' => rand(500, 9500) / 100,
            'memory_usage' => rand(3000, 8500) / 100,
            'storage' => rand(4000, 9000) / 100,
            'uptime' => rand(3600, 86400),
            'network_rbytes' => rand(10000, 999999),
            'network_tbytes' => rand(10000, 999999),
            'created_at' => now(),
        ]);

        if ($shouldBroadcast) {
            ServerStatsUpdated::dispatchSync(
                $server->uuid,
                [
                    't' => $update->created_at->getPreciseTimestamp(3),
                    'c' => round((float) $update->cpu_usage, 1),
                    'm' => round((float) $update->memory_usage, 1),
                    'i' => 0,
                    'o' => 0,
                    'd' => round((float) $update->storage, 1),
                ],
            );
        }
    }

    protected function fireMetrics(): void
    {
        $servers = Server::all();

        if ($servers->isEmpty()) {
            $this->warn('No servers found in database.');
            return;
        }

        $this->info('Found ' . $servers->count() . ' servers.');

        $statuses = ['online', 'offline'];
        $operatingSystems = ['Ubuntu 22.04 LTS', 'Debian 12', 'CentOS Stream 9', 'Windows Server 2022'];
        $cpuOptions = [2, 4, 8, 16, 32];
        $ramOptions = [4, 8, 16, 32, 64, 128];

        foreach ($servers as $server) {
            $randomStatus = $statuses[array_rand($statuses)];

            if ($randomStatus === 'offline') {
                $server->update(['record_status' => 'offline']);
                continue;
            }

            $server->update([
                'record_status' => 'online',
                'cpu_cores' => $server->cpu_cores ?? $cpuOptions[array_rand($cpuOptions)],
                'ram' => $server->ram ?? $ramOptions[array_rand($ramOptions)],
                'operating_system' => $server->operating_system ?? $operatingSystems[array_rand($operatingSystems)],
            ]);

            try {
                $update = ServerUpdate::create([
                    'server_id' => $server->id,
                    'cpu_usage' => rand(500, 9500) / 100,
                    'memory_usage' => rand(3000, 8500) / 100,
                    'storage' => rand(4000, 9000) / 100,
                    'uptime' => rand(3600, 86400),
                    'network_rbytes' => rand(10000, 999999),
                    'network_tbytes' => rand(10000, 999999),
                    'created_at' => now(),
                ]);

                $this->line("  [{$server->server_name}] Created update #{$update->created_at->getPreciseTimestamp(3)}");

                $result = ServerStatsUpdated::dispatchSync(
                    $server->uuid,
                    [
                        't' => $update->created_at->getPreciseTimestamp(3),
                        'c' => round((float) $update->cpu_usage, 1),
                        'm' => round((float) $update->memory_usage, 1),
                        'i' => 0,
                        'o' => 0,
                        'd' => round((float) $update->storage, 1),
                    ],
                );

                if ($result) {
                    $this->line("  [{$server->server_name}] Broadcast ServerStatsUpdated");
                } else {
                    $this->line("  [{$server->server_name}] Skipped broadcast (values unchanged)");
                }
            } catch (\Throwable $e) {
                $this->error("  [{$server->server_name}] Error: " . $e->getMessage());
            }
        }
    }
}
