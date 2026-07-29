<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CheckServerOffline implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $serverUuid)
    {
    }

    public function handle(): void
    {
        // Run MonitorServer synchronously so the offline status update
        // and ServerHealthLog write always execute, even without a queue worker.
        MonitorServer::dispatchSync($this->serverUuid);
    }
}
