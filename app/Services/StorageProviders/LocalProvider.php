<?php

namespace App\Services\StorageProviders;

use App\Contracts\StorageProvider;
use Illuminate\Support\Facades\Storage;

class LocalProvider implements StorageProvider
{
    private string $basePath;

    private string $deliveryUrl;

    public function __construct(array $providerConfig)
    {
        $this->basePath = $providerConfig['base_path'] ?? 'uploads';
        $this->deliveryUrl = $providerConfig['delivery_url'] ?? '/storage/uploads';
    }

    public function uploadConfig(string $storageKey, string $folder, array $purposeConfig): array
    {
        return [
            'provider' => 'local',
            'upload_url' => url('/api/uploads/local/store'),
            'upload_params' => [
                'storage_key' => $storageKey,
                'folder' => $folder,
            ],
        ];
    }

    public function publicUrl(string $storageKey, string $folder): string
    {
        return url("{$this->deliveryUrl}/{$folder}/{$storageKey}");
    }

    public function temporaryUrl(string $storageKey, string $folder, \DateTimeInterface $expiresAt): string
    {
        return $this->publicUrl($storageKey, $folder);
    }

    public function transformedUrl(string $storageKey, string $folder, array $transformations): string
    {
        return $this->publicUrl($storageKey, $folder);
    }

    public function delete(string $storageKey, string $folder): void
    {
        $path = "{$this->basePath}/{$folder}/{$storageKey}";
        if (Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
        }
    }

    public function name(): string
    {
        return 'local';
    }

    public function exists(string $storageKey, string $folder): bool
    {
        $path = "{$this->basePath}/{$folder}/{$storageKey}";

        return Storage::disk('local')->exists($path);
    }
}
