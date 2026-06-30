<?php

namespace App\Console\Commands;

use App\Contracts\StorageProvider;
use App\Enums\UploadIntentStatus;
use App\Models\Client;
use App\Models\UploadIntent;
use App\Models\User;
use App\Services\StorageProviderFactory;
use App\Services\UploadIntentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class StorageConsistencyCheck extends Command
{
    protected $signature = 'uploads:consistency-check';
    protected $description = 'Validate storage consistency between upload intents, entities, and storage assets.';

    public function handle(StorageProviderFactory $factory, UploadIntentService $intentService): int
    {
        $this->info('Running storage consistency check...');

        $issues = [];

        $issues = array_merge($issues, $this->checkIntentsWithoutFiles($factory, $intentService));
        $issues = array_merge($issues, $this->checkEntitiesWithMissingFiles($factory, $intentService));

        if (empty($issues)) {
            $this->info('No consistency issues detected.');
        } else {
            $this->warn('Found ' . count($issues) . ' consistency issue(s):');
            foreach ($issues as $issue) {
                $this->line("  - [{$issue['type']}] {$issue['description']}");
                Log::warning('Storage consistency issue', $issue);
            }
        }

        return Command::SUCCESS;
    }

    private function checkIntentsWithoutFiles(StorageProviderFactory $factory, UploadIntentService $intentService): array
    {
        $issues = [];
        $intents = UploadIntent::whereIn('status', [UploadIntentStatus::ATTACHED, UploadIntentStatus::PENDING])->cursor();

        foreach ($intents as $intent) {
            try {
                $provider = $factory->make($intent->storage_provider);
                $purposeConfig = $intentService->getPurposeConfig($intent->purpose);
                $folder = $purposeConfig['folder'];

                if (!$provider->exists($intent->storage_key, $folder)) {
                    $issues[] = [
                        'type' => 'missing_file',
                        'intent_id' => $intent->id,
                        'storage_key' => $intent->storage_key,
                        'status' => $intent->status->value,
                        'description' => "Upload intent {$intent->id} has status {$intent->status->value} but file does not exist at storage key: {$intent->storage_key}",
                    ];
                }
            } catch (\Exception $e) {
                $issues[] = [
                    'type' => 'check_error',
                    'intent_id' => $intent->id,
                    'error' => $e->getMessage(),
                    'description' => "Error checking upload intent {$intent->id}: {$e->getMessage()}",
                ];
            }
        }

        return $issues;
    }

    private function checkEntitiesWithMissingFiles(StorageProviderFactory $factory, UploadIntentService $intentService): array
    {
        $issues = [];

        $provider = $factory->make();

        User::whereNotNull('profile_picture_storage_key')
            ->chunk(100, function ($users) use ($provider, &$issues) {
                foreach ($users as $user) {
                    $folder = config('uploads.purposes.profile_picture.folder');
                    $exists = $provider->exists($user->profile_picture_storage_key, $folder);
                    if (!$exists) {
                        $issues[] = [
                            'type' => 'entity_missing_file',
                            'entity' => 'user',
                            'entity_id' => $user->id,
                            'storage_key' => $user->profile_picture_storage_key,
                            'description' => "User {$user->id} references storage key {$user->profile_picture_storage_key} but file does not exist",
                        ];
                    }
                }
            });

        Client::whereNotNull('banner_image_storage_key')
            ->chunk(100, function ($clients) use ($provider, &$issues) {
                foreach ($clients as $client) {
                    $folder = config('uploads.purposes.client_banner.folder');
                    $exists = $provider->exists($client->banner_image_storage_key, $folder);
                    if (!$exists) {
                        $issues[] = [
                            'type' => 'entity_missing_file',
                            'entity' => 'client',
                            'entity_id' => $client->id,
                            'storage_key' => $client->banner_image_storage_key,
                            'description' => "Client {$client->id} references storage key {$client->banner_image_storage_key} but file does not exist",
                        ];
                    }
                }
            });

        return $issues;
    }
}
