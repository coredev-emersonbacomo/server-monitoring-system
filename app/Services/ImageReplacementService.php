<?php

namespace App\Services;

class ImageReplacementService
{
    public function __construct(
        private readonly CloudinaryService $cloudinary,
    ) {}

    public function handleReplacement(
        ?string $newUrl,
        ?string $newPublicId,
        ?string $existingUrl,
        ?string $existingPublicId,
    ): void {
        if (empty($newUrl) && empty($newPublicId)) {
            return;
        }

        $oldPublicId = $existingPublicId ?? $this->cloudinary->extractPublicId($existingUrl);

        if (!empty($oldPublicId)) {
            $this->cloudinary->delete($oldPublicId);
        }
    }

    public function handleDeletion(
        ?string $url,
        ?string $publicId,
    ): void {
        $pid = $publicId ?? $this->cloudinary->extractPublicId($url);

        if (!empty($pid)) {
            $this->cloudinary->delete($pid);
        }
    }
}
