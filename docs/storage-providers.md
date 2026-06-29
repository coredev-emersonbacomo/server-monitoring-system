# Storage Providers

This project uses a pluggable storage provider system for handling file uploads (profile pictures, client banners, etc.).

## Architecture

```
UploadIntentController -> UploadIntentService -> StorageProviderFactory -> StorageProvider (interface)
                                                                              ├── LocalProvider
                                                                              ├── CloudinaryProvider
                                                                              └── [custom via register()]
MediaUrlService -> StorageProviderFactory -> StorageProvider::publicUrl()/temporaryUrl()/transformedUrl()
DeleteStorageAsset (Job) -> StorageProviderFactory -> StorageProvider::delete()
```

## Switching Providers

### 1. Set the environment variable

```env
UPLOAD_STORAGE_PROVIDER=local
```

Supported values: `local`, `cloudinary` (default).

### 2. Configure the provider

Provider configs live in `config/uploads.php` under the `providers` key.

#### Local

```env
# defaults are fine for development
UPLOAD_LOCAL_BASE_PATH=uploads
UPLOAD_LOCAL_DELIVERY_URL=/storage/uploads
```

Files are stored in `storage/app/uploads/` and served via a symlink from `public/storage/uploads/`.
Run `php artisan storage:link` if not already done.

#### Cloudinary

```env
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
CLOUDINARY_UPLOAD_PREFIX=https://api.cloudinary.com/v1_1/your_cloud/image/upload
CLOUDINARY_DELIVERY_PREFIX=https://res.cloudinary.com/your_cloud/image/upload
```

### 3. Existing uploads won't carry over

Switching providers does **not** migrate existing files. Previously uploaded images will still reference the old provider and remain accessible at their original URLs (as long as the old provider config remains intact). New uploads go to the new provider.

## Adding a New Provider

### 1. Create the provider class

Implement `App\Contracts\StorageProvider` in `app/Services/StorageProviders/`:

```php
namespace App\Services\StorageProviders;

use App\Contracts\StorageProvider;

class S3Provider implements StorageProvider
{
    public function __construct(array $config)
    {
        // $config comes from config('uploads.providers.s3')
    }

    public function name(): string
    {
        return 's3';
    }

    public function uploadConfig(string $storageKey, string $folder, array $purposeConfig): array
    {
        return [
            'upload_url' => '...',
            'upload_params' => [...],
        ];
    }

    public function publicUrl(string $storageKey, string $folder): string { ... }
    public function temporaryUrl(string $storageKey, string $folder, DateTimeInterface $expiresAt): string { ... }
    public function transformedUrl(string $storageKey, string $folder, array $transformations): string { ... }
    public function delete(string $storageKey, string $folder): void { ... }
    public function exists(string $storageKey, string $folder): bool { ... }
}
```

### 2. Register in config

Add provider config to `config/uploads.php` under `providers`:

```php
's3' => [
    'key' => env('S3_KEY'),
    'secret' => env('S3_SECRET'),
    'region' => env('S3_REGION'),
    'bucket' => env('S3_BUCKET'),
    'delivery_prefix' => env('S3_DELIVERY_PREFIX'),
],
```

### 3. Register in the factory

Add a match case in `App\Services\StorageProviderFactory::make()`:

```php
's3' => new S3Provider($providerConfig),
```

### 4. Update the frontend upload handler (if needed)

`frontend/src/services/directUpload.ts` handles the actual browser-to-provider upload. For `local` and `cloudinary` it POSTs via `XMLHttpRequest` using the `upload_url` and `upload_params` from the intent's `upload_config`. If your provider needs a different upload flow (e.g., presigned PUT), extend `directUpload.ts` or create a new upload handler.

### 5. Update test coverage

Add test cases in `tests/Feature/UploadIntentTest.php` for the new provider's upload config, URL generation, and deletion. See existing `local` and `cloudinary` test cases for reference.

## Provider Interface

```php
interface StorageProvider
{
    /** Upload credentials/config for direct browser uploads */
    public function uploadConfig(string $storageKey, string $folder, array $purposeConfig): array;

    /** Permanent public URL */
    public function publicUrl(string $storageKey, string $folder): string;

    /** Signed/temporary URL */
    public function temporaryUrl(string $storageKey, string $folder, DateTimeInterface $expiresAt): string;

    /** Transformed image URL (e.g. resized) */
    public function transformedUrl(string $storageKey, string $folder, array $transformations): string;

    /** Delete a file */
    public function delete(string $storageKey, string $folder): void;

    /** Provider identifier */
    public function name(): string;

    /** Check if a file exists */
    public function exists(string $storageKey, string $folder): bool;
}
```

## Registering Third-Party / Custom Providers

For providers that shouldn't be hardcoded in the factory:

```php
use App\Services\StorageProviderFactory;

StorageProviderFactory::register('my_provider', MyCustomProvider::class);
```

This can be done in a service provider's `boot()` method or in `AppServiceProvider::boot()`. The class must implement `StorageProvider` and its constructor receives the provider config array.

## Key Files

| File | Purpose |
|------|---------|
| `app/Contracts/StorageProvider.php` | Interface all providers must implement |
| `app/Services/StorageProviders/LocalProvider.php` | Local filesystem provider |
| `app/Services/StorageProviders/CloudinaryProvider.php` | Cloudinary provider |
| `app/Services/StorageProviderFactory.php` | Factory that resolves provider by name |
| `app/Services/MediaUrlService.php` | High-level URL generation for profile pics, banners |
| `app/Services/UploadIntentService.php` | Upload intent lifecycle (create, attach, expire) |
| `config/uploads.php` | Provider configs, purposes, rate limits |
| `frontend/src/services/directUpload.ts` | Browser-side upload logic |
