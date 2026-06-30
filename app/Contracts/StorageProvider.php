<?php

namespace App\Contracts;

interface StorageProvider
{
    /**
     * Generate upload credentials/config for direct browser upload.
     */
    public function uploadConfig(string $storageKey, string $folder, array $purposeConfig): array;

    /**
     * Get the public URL for a stored file.
     */
    public function publicUrl(string $storageKey, string $folder): string;

    /**
     * Get a signed/temporary URL for a stored file.
     */
    public function temporaryUrl(string $storageKey, string $folder, \DateTimeInterface $expiresAt): string;

    /**
     * Get a transformed image URL (if supported).
     */
    public function transformedUrl(string $storageKey, string $folder, array $transformations): string;

    /**
     * Delete a file from storage.
     */
    public function delete(string $storageKey, string $folder): void;

    /**
     * Get the provider name identifier.
     */
    public function name(): string;

    /**
     * Check if a file exists in storage.
     */
    public function exists(string $storageKey, string $folder): bool;
}
