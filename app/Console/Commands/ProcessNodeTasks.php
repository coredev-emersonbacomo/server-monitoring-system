<?php

namespace App\Console\Commands;

use App\NodeConfig\Engine\NodeTaskScheduler;
use Illuminate\Console\Command;

class ProcessNodeTasks extends Command
{
    protected $signature = 'node-tasks:process';

    protected $description = 'Process due node config timer tasks from the in-memory scheduler';

    public function handle(): int
    {
        NodeTaskScheduler::processDueTasks();
        return self::SUCCESS;
    }
}
