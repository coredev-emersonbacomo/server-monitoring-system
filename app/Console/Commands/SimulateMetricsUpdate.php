<?php

namespace App\Console\Commands;

use App\Events\ServerStatsUpdated;
use App\Models\Server;
use App\Models\ServerUpdate;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Pool;
use GuzzleHttp\Psr7\Request;
use Illuminate\Console\Command;

class SimulateMetricsUpdate extends Command
{
    protected $signature = 'server:update-metrics {--daemon}';

    protected $description = 'Simulates incoming daemon metric updates and hardware profiles for all servers';

    private const CONCURRENCY = 20;

    public function handle()
    {
        if ($this->option('daemon')) {
            $this->runDaemon();

            return 0;
        }

        $this->fireMetrics();
        $this->info('Injected single-shot metrics update.');
    }

    protected function buildRanges(iterable $servers): array
    {
        $ranges = [];
        foreach ($servers as $server) {
            $seed = crc32($server->uuid);
            mt_srand($seed);
            $spread = mt_rand(10, 25);
            $ranges[$server->id] = [
                'cpu' => [mt_rand(0, 80), $spread],
                'memory' => [mt_rand(5, 80), $spread],
                'disk' => [mt_rand(0, 80), $spread],
            ];
            mt_srand();
        }

        return $ranges;
    }

    protected function randInRange(array $range): float
    {
        return max(0, min(100, rand($range[0], $range[0] + $range[1])));
    }

    protected function runDaemon(): void
    {
        $servers = Server::all();

        if ($servers->isEmpty()) {
            $this->warn('No servers found in database.');

            return;
        }

        $ranges = $this->buildRanges($servers);

        $this->info("Starting concurrent HTTP simulator for {$servers->count()} servers (Ctrl+C to stop)...");

        $client = new Client([
            'base_uri' => 'http://server-monitoring-system.test',
            'timeout' => 5,
            'http_errors' => false,
        ]);

        while (true) {
            $start = microtime(true);
            $success = 0;
            $failed = 0;

            $requests = function () use ($servers, $ranges) {
                foreach ($servers as $server) {
                    $r = $ranges[$server->id];
                    yield new Request('POST', '/api/server/stats', [
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                    ], json_encode([
                        'uuid' => $server->uuid,
                        'token' => 'simulated',
                        'timestamp' => time(),
                        'cpu' => ['load1' => $this->randInRange($r['cpu'])],
                        'memory' => ['percent' => $this->randInRange($r['memory'])],
                        'disk' => ['percent' => $this->randInRange($r['disk'])],
                        'uptime' => rand(3600, 86400),
                        'network' => [
                            ['rx_bytes' => rand(10000, 999999), 'tx_bytes' => rand(10000, 999999)],
                        ],
                    ]));
                }
            };

            $pool = new Pool($client, $requests(), [
                'concurrency' => self::CONCURRENCY,
                'fulfilled' => function () use (&$success) {
                    $success++;
                },
                'rejected' => function ($reason) use (&$failed) {
                    $failed++;

                    dump($reason);

                    if ($reason instanceof RequestException) {
                        dump($reason->getMessage());

                        if ($reason->hasResponse()) {
                            dump((string) $reason->getResponse()->getBody());
                        }
                    }
                },
            ]);

            $pool->promise()->wait();

            $elapsed = (microtime(true) - $start) * 1000;
            $this->line("  Batch: {$servers->count()} servers ({$success} ok, {$failed} fail) in {$elapsed}ms");

            $sleep = max(0, 1_000_000 - (int) ($elapsed * 1000));
            usleep($sleep);
        }
    }

    protected function fireMetrics(): void
    {
        $servers = Server::all();

        if ($servers->isEmpty()) {
            $this->warn('No servers found in database.');

            return;
        }

        $ranges = $this->buildRanges($servers);

        $this->info('Found '.$servers->count().' servers.');

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
                $r = $ranges[$server->id];
                $update = ServerUpdate::create([
                    'server_id' => $server->id,
                    'cpu_usage' => $this->randInRange($r['cpu']),
                    'memory_usage' => $this->randInRange($r['memory']),
                    'storage' => $this->randInRange($r['disk']),
                    'uptime' => rand(3600, 86400),
                    'network_rbytes' => rand(10000, 999999),
                    'network_tbytes' => rand(10000, 999999),
                    'created_at' => now(),
                ]);

                $this->line("  [{$server->name}] Created update #{$update->created_at->getPreciseTimestamp(3)}");

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
                    $this->line("  [{$server->name}] Broadcast ServerStatsUpdated");
                } else {
                    $this->line("  [{$server->name}] Skipped broadcast (values unchanged)");
                }
            } catch (\Throwable $e) {
                $this->error("  [{$server->name}] Error: ".$e->getMessage());
            }
        }
    }
}
