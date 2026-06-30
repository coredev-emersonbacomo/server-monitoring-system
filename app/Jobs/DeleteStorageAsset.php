<?php

namespace App\Jobs;

use App\Contracts\StorageProvider;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class DeleteStorageAsset implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        private readonly string $storageKey,
        private readonly string $folder,
        private readonly ?string $providerName = null,
    ) {}

    public function handle(\App\Services\StorageProviderFactory $factory): void
    {
        if (empty($this->storageKey)) {
            return;
        }

        try {
            $provider = $factory->make($this->providerName);
            $provider->delete($this->storageKey, $this->folder);

            Log::info('Storage asset deleted', [
                'storage_key' => $this->storageKey,
                'folder' => $this->folder,
                'provider' => $this->providerName ?? 'default',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete storage asset', [
                'storage_key' => $this->storageKey,
                'folder' => $this->folder,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
