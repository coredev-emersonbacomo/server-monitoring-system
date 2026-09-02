<?php

namespace App\Console\Commands;

use App\Services\AgentDataCleanupService;
use Illuminate\Console\Command;

class CleanupAgentLogs extends Command
{
    protected $signature = 'agent-data:cleanup';

    protected $description = 'Delete high-volume agent data (heartbeats, metric data, file activity) older than the configured retention period (default 60 days). Agent logs and other long-term records are kept.';

    public function handle(AgentDataCleanupService $service): int
    {
        $counts = $service->cleanup();

        $this->info('Agent data cleanup complete: '.json_encode($counts));

        return Command::SUCCESS;
    }
}
