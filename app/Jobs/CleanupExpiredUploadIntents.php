<?php

namespace App\Jobs;

use App\Enums\UploadIntentStatus;
use App\Models\UploadIntent;
use App\Services\UploadIntentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CleanupExpiredUploadIntents implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function handle(UploadIntentService $intentService): void
    {
        $expiredIntents = UploadIntent::query()
            ->where('status', UploadIntentStatus::PENDING)
            ->where('expires_at', '<', now())
            ->cursor();

        $count = 0;

        foreach ($expiredIntents as $intent) {
            try {
                $provider = $intentService->getProviderForIntent($intent);
                $purposeConfig = $intentService->getPurposeConfig($intent->purpose);
                $folder = $purposeConfig['folder'];

                $provider->delete($intent->storage_key, $folder);

                $intentService->markExpired($intent);

                Log::info('Expired upload intent cleaned up', [
                    'intent_id' => $intent->id,
                    'storage_key' => $intent->storage_key,
                    'purpose' => $intent->purpose->value,
                ]);

                $count++;
            } catch (\Exception $e) {
                Log::warning('Storage delete failed, marking intent expired anyway', [
                    'intent_id' => $intent->id,
                    'error' => $e->getMessage(),
                ]);

                $intentService->markExpired($intent);
            }
        }

        Log::info("Cleaned up {$count} expired upload intents.");
    }
}
