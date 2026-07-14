<?php

namespace App\Jobs;

use App\Models\Server;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class PingServerPorts implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public Server $server)
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $agent = $this->server->agent;
        if (!$agent) {
            return;
        }

        $host = $this->server->host_name;
        if (!$host) {
            return;
        }

        $ports = $agent->ports->filter(fn($p) => $p->protocol === 'tcp');
        if ($ports->isEmpty()) {
            return;
        }

        $startTime = microtime(true);

        $pool = \Illuminate\Support\Facades\Process::pool(function (\Illuminate\Process\Pool $pool) use ($ports, $host) {
            foreach ($ports as $port) {
                $cmd = implode(' ', [
                    'bash', '-c',
                    escapeshellarg("TIMEFORMAT='%R'; time nc -zv -w 2 {$host} {$port->port}")
                ]);
                $pool->as((string)$port->id)->command($cmd);
            }
        });

        $responses = $pool->start()->wait();

        foreach ($ports as $port) {
            $response = $responses[(string)$port->id];
            if ($response->successful()) {
                // 'time' and nc both write to stderr; time value is the last line
                $lines = array_filter(explode("\n", trim($response->errorOutput())));
                $seconds = (float) trim(end($lines));
                $pingTime = (int) round($seconds * 1000); // convert to ms
                $port->update([
                    'ping_status' => 'online',
                    'ping_time' => $pingTime,
                ]);
            } else {
                $port->update([
                    'ping_status' => 'offline',
                    'ping_time' => null,
                ]);
            }
        }
    }
}
