<?php

namespace App\Services\StorageProviders;

use App\Contracts\StorageProvider;
use Cloudinary\Api\Admin\AdminApi;
use Cloudinary\Api\Upload\UploadApi;
use Cloudinary\Configuration\Configuration;
use Illuminate\Support\Str;

class CloudinaryProvider implements StorageProvider
{
    private Configuration $config;

    private string $cloudName;

    private string $apiKey;

    private string $apiSecret;

    public function __construct(array $providerConfig)
    {
        $this->cloudName = $providerConfig['cloud_name'];
        $this->apiKey = $providerConfig['api_key'];
        $this->apiSecret = $providerConfig['api_secret'];

        $this->config = Configuration::instance([
            'cloud' => [
                'cloud_name' => $this->cloudName,
                'api_key' => $this->apiKey,
                'api_secret' => $this->apiSecret,
            ],
        ]);
    }

    public function uploadConfig(string $storageKey, string $folder, array $purposeConfig): array
    {
        $timestamp = now()->timestamp;

        $relativeId = Str::after($storageKey, "{$folder}/");

        $params = [
            'folder' => $folder,
            'timestamp' => $timestamp,
            'public_id' => $relativeId,
        ];

        ksort($params);
        $queryParts = [];
        foreach ($params as $key => $value) {
            $queryParts[] = "{$key}={$value}";
        }
        $signature = sha1(implode('&', $queryParts).$this->apiSecret);

        $uploadPrefix = config('uploads.providers.cloudinary.upload_prefix');

        return [
            'provider' => 'cloudinary',
            'upload_url' => "{$uploadPrefix}/{$this->cloudName}/auto/upload",
            'upload_params' => [
                'api_key' => $this->apiKey,
                'timestamp' => $timestamp,
                'folder' => $folder,
                'public_id' => $relativeId,
                'signature' => $signature,
            ],
        ];
    }

    public function publicUrl(string $storageKey, string $folder): string
    {
        $deliveryPrefix = config('uploads.providers.cloudinary.delivery_prefix');

        return "{$deliveryPrefix}/{$this->cloudName}/image/upload/{$storageKey}";
    }

    public function temporaryUrl(string $storageKey, string $folder, \DateTimeInterface $expiresAt): string
    {
        // Cloudinary signed URLs are generated via the SDK
        // Fall back to public URL for simplicity
        return $this->publicUrl($storageKey, $folder);
    }

    public function transformedUrl(string $storageKey, string $folder, array $transformations): string
    {
        $transforms = collect($transformations)
            ->map(fn ($value, $key) => "{$key}_{$value}")
            ->implode(',');

        $deliveryPrefix = config('uploads.providers.cloudinary.delivery_prefix');

        $transformsPart = $transforms ? "{$transforms}/" : '';

        return "{$deliveryPrefix}/{$this->cloudName}/image/upload/{$transformsPart}{$storageKey}";
    }

    public function delete(string $storageKey, string $folder): void
    {
        if (empty($storageKey)) {
            return;
        }

        $api = new UploadApi($this->config);
        $api->destroy($storageKey);
    }

    public function name(): string
    {
        return 'cloudinary';
    }

    public function exists(string $storageKey, string $folder): bool
    {
        try {
            $admin = new AdminApi($this->config);
            $admin->asset($storageKey);

            return true;
        } catch (\Exception) {
            return false;
        }
    }
}
