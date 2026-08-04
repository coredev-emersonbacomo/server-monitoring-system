import { Database } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import {
    Section,
    SubSection,
    CodeBlock,
    InlineCode,
    Callout,
} from "@/components/docs/Section";

export default function DocsStorageProviders() {
    return (
        <PageLayout>
            <IndexHeader
                icon={Database}
                title="Storage Providers"
                description="Pluggable storage provider system for file uploads (profile pictures, client banners, etc.)."
                trail={[{ label: "Docs" }, { label: "Storage Providers" }]}
            />

            <main className="py-6 w-full flex-1">
                <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-10">
                    <Section title="Architecture">
                        <CodeBlock>{`UploadIntentController -> UploadIntentService -> StorageProviderFactory -> StorageProvider (interface)
                                                                              ├── LocalProvider
                                                                              ├── CloudinaryProvider
                                                                              └── [custom via register()]
MediaUrlService -> StorageProviderFactory -> StorageProvider::publicUrl()/temporaryUrl()/transformedUrl()
DeleteStorageAsset (Job) -> StorageProviderFactory -> StorageProvider::delete()`}</CodeBlock>
                    </Section>

                    <Section title="Switching Providers">
                        <SubSection title="1. Set the environment variable">
                            <CodeBlock>{`UPLOAD_STORAGE_PROVIDER=local`}</CodeBlock>
                            <p>
                                Supported values: <InlineCode>local</InlineCode>,{" "}
                                <InlineCode>cloudinary</InlineCode> (default).
                            </p>
                        </SubSection>

                        <SubSection title="2. Configure the provider">
                            <p>
                                Provider configs live in{" "}
                                <InlineCode>config/uploads.php</InlineCode> under the{" "}
                                <InlineCode>providers</InlineCode> key.
                            </p>
                            <p>
                                <strong>Local</strong>
                            </p>
                            <CodeBlock>{`# defaults are fine for development
UPLOAD_LOCAL_BASE_PATH=uploads
UPLOAD_LOCAL_DELIVERY_URL=/storage/uploads`}</CodeBlock>
                            <p>
                                Files are stored in{" "}
                                <InlineCode>storage/app/uploads/</InlineCode> and served via
                                a symlink from{" "}
                                <InlineCode>public/storage/uploads/</InlineCode>. Run{" "}
                                <InlineCode>php artisan storage:link</InlineCode> if not
                                already done.
                            </p>
                            <p>
                                <strong>Cloudinary</strong>
                            </p>
                            <CodeBlock>{`CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
CLOUDINARY_UPLOAD_PREFIX=https://api.cloudinary.com/v1_1/your_cloud/image/upload
CLOUDINARY_DELIVERY_PREFIX=https://res.cloudinary.com/your_cloud/image/upload`}</CodeBlock>
                        </SubSection>

                        <SubSection title="3. Existing uploads won't carry over">
                            <Callout type="warning">
                                Switching providers does <strong>not</strong> migrate existing
                                files. Previously uploaded images will still reference the old
                                provider and remain accessible at their original URLs (as long
                                as the old provider config remains intact). New uploads go to
                                the new provider.
                            </Callout>
                        </SubSection>
                    </Section>

                    <Section title="Adding a New Provider">
                        <SubSection title="1. Create the provider class">
                            <p>
                                Implement <InlineCode>App\Contracts\StorageProvider</InlineCode>{" "}
                                in <InlineCode>app/Services/StorageProviders/</InlineCode>:
                            </p>
                            <CodeBlock>{`namespace App\Services\StorageProviders;

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
}`}</CodeBlock>
                        </SubSection>

                        <SubSection title="2. Register in config">
                            <p>
                                Add provider config to{" "}
                                <InlineCode>config/uploads.php</InlineCode> under{" "}
                                <InlineCode>providers</InlineCode>:
                            </p>
                            <CodeBlock>{`'s3' => [
    'key' => env('S3_KEY'),
    'secret' => env('S3_SECRET'),
    'region' => env('S3_REGION'),
    'bucket' => env('S3_BUCKET'),
    'delivery_prefix' => env('S3_DELIVERY_PREFIX'),
],`}</CodeBlock>
                        </SubSection>

                        <SubSection title="3. Register in the factory">
                            <p>
                                Add a match case in{" "}
                                <InlineCode>App\Services\StorageProviderFactory::make()</InlineCode>:
                            </p>
                            <CodeBlock>{`'s3' => new S3Provider($providerConfig),`}</CodeBlock>
                        </SubSection>

                        <SubSection title="4. Update the frontend upload handler (if needed)">
                            <p>
                                <InlineCode>frontend/src/services/directUpload.ts</InlineCode>{" "}
                                handles the actual browser-to-provider upload. For{" "}
                                <InlineCode>local</InlineCode> and{" "}
                                <InlineCode>cloudinary</InlineCode> it POSTs via{" "}
                                <InlineCode>XMLHttpRequest</InlineCode> using the{" "}
                                <InlineCode>upload_url</InlineCode> and{" "}
                                <InlineCode>upload_params</InlineCode> from the intent's{" "}
                                <InlineCode>upload_config</InlineCode>. If your provider needs
                                a different upload flow (e.g., presigned PUT), extend{" "}
                                <InlineCode>directUpload.ts</InlineCode> or create a new
                                upload handler.
                            </p>
                        </SubSection>

                        <SubSection title="5. Update test coverage">
                            <p>
                                Add test cases in{" "}
                                <InlineCode>tests/Feature/UploadIntentTest.php</InlineCode> for
                                the new provider's upload config, URL generation, and
                                deletion. See existing <InlineCode>local</InlineCode> and{" "}
                                <InlineCode>cloudinary</InlineCode> test cases for reference.
                            </p>
                        </SubSection>
                    </Section>

                    <Section title="Provider Interface">
                        <CodeBlock>{`interface StorageProvider
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
}`}</CodeBlock>
                    </Section>

                    <Section title="Registering Third-Party / Custom Providers">
                        <p>
                            For providers that shouldn't be hardcoded in the factory:
                        </p>
                        <CodeBlock>{`use App\Services\StorageProviderFactory;

StorageProviderFactory::register('my_provider', MyCustomProvider::class);`}</CodeBlock>
                        <p>
                            This can be done in a service provider's{" "}
                            <InlineCode>boot()</InlineCode> method or in{" "}
                            <InlineCode>AppServiceProvider::boot()</InlineCode>. The class
                            must implement <InlineCode>StorageProvider</InlineCode> and its
                            constructor receives the provider config array.
                        </p>
                    </Section>

                    <Section title="Key Files">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                                <thead className="bg-muted/30">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-medium text-foreground">
                                            File
                                        </th>
                                        <th className="text-left px-3 py-2 font-medium text-foreground">
                                            Purpose
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    <tr>
                                        <td className="px-3 py-1.5 font-mono text-xs">
                                            app/Contracts/StorageProvider.php
                                        </td>
                                        <td className="px-3 py-1.5">
                                            Interface all providers must implement
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-1.5 font-mono text-xs">
                                            app/Services/StorageProviders/LocalProvider.php
                                        </td>
                                        <td className="px-3 py-1.5">
                                            Local filesystem provider
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-1.5 font-mono text-xs">
                                            app/Services/StorageProviders/CloudinaryProvider.php
                                        </td>
                                        <td className="px-3 py-1.5">
                                            Cloudinary provider
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-1.5 font-mono text-xs">
                                            app/Services/StorageProviderFactory.php
                                        </td>
                                        <td className="px-3 py-1.5">
                                            Factory that resolves provider by name
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-1.5 font-mono text-xs">
                                            app/Services/MediaUrlService.php
                                        </td>
                                        <td className="px-3 py-1.5">
                                            High-level URL generation for profile pics, banners
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-1.5 font-mono text-xs">
                                            app/Services/UploadIntentService.php
                                        </td>
                                        <td className="px-3 py-1.5">
                                            Upload intent lifecycle (create, attach, expire)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-1.5 font-mono text-xs">
                                            config/uploads.php
                                        </td>
                                        <td className="px-3 py-1.5">
                                            Provider configs, purposes, rate limits
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-1.5 font-mono text-xs">
                                            frontend/src/services/directUpload.ts
                                        </td>
                                        <td className="px-3 py-1.5">
                                            Browser-side upload logic
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Section>
                </div>
            </main>
        </PageLayout>
    );
}
