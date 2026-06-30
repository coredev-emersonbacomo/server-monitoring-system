<?php

namespace App\Services;

use App\Contracts\StorageProvider;
use App\Services\StorageProviders\CloudinaryProvider;
use App\Services\StorageProviders\LocalProvider;
use InvalidArgumentException;

class StorageProviderFactory
{
    /**
     * Registered custom provider classes.
     *
     * @var array<string, class-string<StorageProvider>>
     */
    private static array $customProviders = [];

    public static function register(string $name, string $providerClass): void
    {
        self::$customProviders[$name] = $providerClass;
    }

    public function make(?string $providerName = null): StorageProvider
    {
        $providerName = $providerName ?? config('uploads.default_provider', 'cloudinary');
        $providers = config('uploads.providers', []);

        if (!isset($providers[$providerName])) {
            throw new InvalidArgumentException("Storage provider [{$providerName}] is not configured.");
        }

        $providerConfig = $providers[$providerName];

        return match ($providerName) {
            'cloudinary' => new CloudinaryProvider($providerConfig),
            'local' => new LocalProvider($providerConfig),
            default => $this->resolveCustomProvider($providerName, $providerConfig),
        };
    }

    private function resolveCustomProvider(string $name, array $config): StorageProvider
    {
        if (isset(self::$customProviders[$name])) {
            $class = self::$customProviders[$name];
            return new $class($config);
        }

        throw new InvalidArgumentException("Unsupported storage provider: [{$name}].");
    }
}
