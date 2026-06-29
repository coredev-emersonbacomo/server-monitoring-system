<?php

namespace App\Services;

use App\Contracts\StorageProvider;
use App\Enums\UploadIntentStatus;
use App\Enums\UploadPurpose;
use App\Models\UploadIntent;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use InvalidArgumentException;

class UploadIntentService
{
    public function __construct(
        private readonly StorageProviderFactory $providerFactory,
    ) {}

    public function create(User $user, UploadPurpose $purpose): UploadIntent
    {
        $purposeConfig = $this->getPurposeConfig($purpose);
        $provider = $this->providerFactory->make();
        $storageKey = $this->generateStorageKey($user, $provider, $purposeConfig);
        $folder = $purposeConfig['folder'];
        $expiresAt = now()->addHours($purposeConfig['retention_hours']);

        $uploadConfig = $provider->uploadConfig($storageKey, $folder, $purposeConfig);

        $intent = UploadIntent::create([
            'user_id' => $user->id,
            'purpose' => $purpose->value,
            'storage_provider' => $provider->name(),
            'storage_key' => $storageKey,
            'status' => UploadIntentStatus::PENDING,
            'expires_at' => $expiresAt,
            'metadata' => $uploadConfig,
        ]);

        return $intent;
    }

    public function attach(
        string $intentId,
        User $user,
        Model $entity,
        string $entityType,
    ): UploadIntent {
        $intent = UploadIntent::findOrFail($intentId);

        $this->validateAttachment($intent, $user);

        $intent->update([
            'status' => UploadIntentStatus::ATTACHED,
            'attached_to_type' => $entityType,
            'attached_to_id' => $entity->getKey(),
            'attached_at' => now(),
        ]);

        return $intent;
    }

    public function markDeleted(UploadIntent $intent): void
    {
        $intent->update([
            'status' => UploadIntentStatus::DELETED,
        ]);
    }

    public function validateAttachment(UploadIntent $intent, User $user): void
    {
        if ($intent->user_id !== $user->id) {
            throw new InvalidArgumentException('Upload intent does not belong to this user.');
        }

        if (!$intent->isPending()) {
            throw new InvalidArgumentException('Upload intent is not in a pending state.');
        }

        if ($intent->isExpired()) {
            $this->markExpired($intent);
            throw new InvalidArgumentException('Upload intent has expired.');
        }
    }

    public function markExpired(UploadIntent $intent): void
    {
        $intent->update([
            'status' => UploadIntentStatus::EXPIRED,
        ]);
    }

    public function getProviderForIntent(UploadIntent $intent): StorageProvider
    {
        return $this->providerFactory->make($intent->storage_provider);
    }

    public function getPurposeConfig(UploadPurpose $purpose): array
    {
        $purposes = config('uploads.purposes', []);

        if (!isset($purposes[$purpose->value])) {
            throw new InvalidArgumentException("No configuration found for upload purpose: {$purpose->value}");
        }

        return $purposes[$purpose->value];
    }

    public function getRateLimit(UploadPurpose $purpose): int
    {
        $limits = config('uploads.rate_limits', []);

        return $limits[$purpose->value] ?? 5;
    }

    private function generateStorageKey(User $user, StorageProvider $provider, array $purposeConfig): string
    {
        $folder = $purposeConfig['folder'];
        $uuid = (string) Str::uuid();

        return "{$folder}/user_{$user->id}/{$uuid}";
    }
}
