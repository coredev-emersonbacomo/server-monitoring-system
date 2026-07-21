<?php

namespace App\Jobs;

use App\Models\Server;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CheckServerOffline implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public string $serverUuid)
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $server = Server::with('agent')->where('uuid', $this->serverUuid)->first();
        if (!$server) {
            return;
        }

        $server->checkOfflineStatus();
    }
}
