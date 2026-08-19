<?php

namespace App\Console\Commands;

use App\Models\ProvisionToken;
use Illuminate\Console\Command;

class CleanupProvisionTokens extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tokens:cleanup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up expired active provision tokens';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $count = ProvisionToken::where('status', 'active')
            ->where('expires_at', '<', now())
            ->update(['status' => 'expired']);

        $this->info("Successfully expired {$count} provision tokens.");
    }
}
