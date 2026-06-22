<?php

namespace App\Services;

use Cloudinary\Configuration\Configuration;
use Cloudinary\Api\Upload\UploadApi;

class CloudinaryService
{
    private Configuration $config;

    public function __construct()
    {
        $this->config = Configuration::instance([
            'cloud' => [
                'cloud_name' => config('cloudinary.cloud_name'),
                'api_key' => config('cloudinary.api_key'),
                'api_secret' => config('cloudinary.api_secret'),
            ],
        ]);
    }

    public function generateSignature(string $folder): array
    {
        $timestamp = now()->timestamp;
        $params = [
            'folder' => $folder,
            'timestamp' => $timestamp,
        ];
        ksort($params);

        $signature = sha1(http_build_query($params) . config('cloudinary.api_secret'));

        return [
            'cloud_name' => config('cloudinary.cloud_name'),
            'api_key' => config('cloudinary.api_key'),
            'timestamp' => $timestamp,
            'folder' => $folder,
            'signature' => $signature,
        ];
    }

    public function delete(string $publicId): void
    {
        if (empty($publicId)) {
            return;
        }

        $api = new UploadApi($this->config);
        $api->destroy($publicId);
    }

    public function transformedUrl(string $publicId, array $transform): string
    {
        $cloudName = config('cloudinary.cloud_name');
        $transforms = collect($transform)
            ->map(fn($value, $key) => "{$key}_{$value}")
            ->implode(',');

        return "https://res.cloudinary.com/{$cloudName}/image/upload/{$transforms}/{$publicId}";
    }

    public function extractPublicId(?string $url): ?string
    {
        if (empty($url)) {
            return null;
        }

        $cloudName = config('cloudinary.cloud_name');
        $pattern = "/\/v\d+\/(.+?)(?:\.\w+)?$/";

        if (preg_match($pattern, $url, $matches)) {
            $publicId = $matches[1];
            $publicId = preg_replace('/\.\w+$/', '', $publicId);
            return $publicId;
        }

        return null;
    }
}
