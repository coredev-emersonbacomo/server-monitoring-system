<?php

namespace App\Services;

use App\Contracts\StorageProvider;
use App\Enums\UploadPurpose;

class MediaUrlService
{
    private StorageProvider $provider;

    public function __construct(
        private readonly StorageProviderFactory $providerFactory,
    ) {
        $this->provider = $this->providerFactory->make();
    }

    public function url(?string $storageKey, UploadPurpose $purpose): string
    {
        if (empty($storageKey)) {
            return $this->defaultForPurpose($purpose);
        }

        $purposeConfig = app(UploadIntentService::class)->getPurposeConfig($purpose);

        return $this->provider->publicUrl($storageKey, $purposeConfig['folder']);
    }

    public function temporaryUrl(string $storageKey, UploadPurpose $purpose, \DateTimeInterface $expiresAt): string
    {
        if (empty($storageKey)) {
            return $this->defaultForPurpose($purpose);
        }

        $purposeConfig = app(UploadIntentService::class)->getPurposeConfig($purpose);

        return $this->provider->temporaryUrl($storageKey, $purposeConfig['folder'], $expiresAt);
    }

    public function transformedUrl(string $storageKey, UploadPurpose $purpose, string $transformationName): string
    {
        if (empty($storageKey)) {
            return $this->defaultForPurpose($purpose);
        }

        $purposeConfig = app(UploadIntentService::class)->getPurposeConfig($purpose);
        $transformations = $this->getTransformations($purpose, $transformationName);

        return $this->provider->transformedUrl($storageKey, $purposeConfig['folder'], $transformations);
    }

    public function profilePicture(?string $storageKey): string
    {
        return $this->url($storageKey, UploadPurpose::PROFILE_PICTURE);
    }

    public function profilePictureTransformed(?string $storageKey, string $variant = 'avatar_128'): string
    {
        return $this->transformedUrl($storageKey, UploadPurpose::PROFILE_PICTURE, $variant);
    }

    public function clientBanner(?string $storageKey): string
    {
        return $this->url($storageKey, UploadPurpose::CLIENT_BANNER);
    }

    public function clientBannerTransformed(?string $storageKey, string $variant = 'banner_1200'): string
    {
        return $this->transformedUrl($storageKey, UploadPurpose::CLIENT_BANNER, $variant);
    }

    private function getTransformations(UploadPurpose $purpose, string $name): array
    {
        $providerConfig = config("uploads.providers.{$this->provider->name()}.transformations", []);

        $purposeConfig = app(UploadIntentService::class)->getPurposeConfig($purpose);
        $folder = $purposeConfig['folder'];

        if (!isset($providerConfig[$folder][$name])) {
            return [];
        }

        return $providerConfig[$folder][$name];
    }

    private function defaultForPurpose(UploadPurpose $purpose): string
    {
        return match ($purpose) {
            UploadPurpose::PROFILE_PICTURE => config('app.default_profile_picture', ''),
            UploadPurpose::CLIENT_BANNER => config('app.default_client_banner_img_unsplash', ''),
            default => '',
        };
    }
}
