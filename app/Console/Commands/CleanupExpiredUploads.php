<?php

namespace App\Console\Commands;

use App\Jobs\CleanupExpiredUploadIntents;
use Illuminate\Console\Command;

class CleanupExpiredUploads extends Command
{
    protected $signature = 'uploads:cleanup';

    protected $description = 'Clean up expired upload intents and their associated storage assets.';

    public function handle(): int
    {
        $this->info('Starting cleanup of expired upload intents...');

        CleanupExpiredUploadIntents::dispatch();

        $this->info('Cleanup job dispatched successfully.');

        return Command::SUCCESS;
    }
}
