<?php

use Symfony\Component\Yaml\Yaml;

function prodOverlayEnv(string $service): array
{
    $overlay = Yaml::parseFile(base_path('compose.prod.yaml'));

    return $overlay['services'][$service]['environment'] ?? [];
}

function dockerExampleKeys(): array
{
    $keys = [];
    foreach (file(base_path('.env.docker.example'), FILE_IGNORE_NEW_LINES) as $line) {
        if (preg_match('/^([A-Z][A-Z0-9_]*)=/', trim($line), $m)) {
            $keys[] = $m[1];
        }
    }

    return $keys;
}

test('prod overlay maps app secrets into the app container', function () {
    $env = prodOverlayEnv('app');

    foreach (['APP_KEY', 'JWT_SECRET', 'UPLOAD_STORAGE_PROVIDER'] as $key) {
        expect($env)->toHaveKey($key);
    }

    foreach (['MAIL_MAILER', 'MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM_ADDRESS'] as $key) {
        expect($env)->toHaveKey($key);
    }

    foreach (['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as $key) {
        expect($env)->toHaveKey($key);
    }
});

test('prod overlay maps mail and storage config into the queue container', function () {
    // Queue executes mail + storage-delete jobs, so it needs the same
    // provider config as app (but no APP_KEY/JWT_SECRET).
    $env = prodOverlayEnv('queue');

    foreach (['UPLOAD_STORAGE_PROVIDER', 'MAIL_HOST', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'CLOUDINARY_API_SECRET'] as $key) {
        expect($env)->toHaveKey($key);
    }
});

test('every prod overlay variable is documented in .env.docker.example', function () {
    $overlay = Yaml::parseFile(base_path('compose.prod.yaml'));
    $exampleKeys = dockerExampleKeys();

    $referenced = [];
    foreach (['app', 'queue', 'reverb', 'scheduler', 'postgres'] as $service) {
        foreach ($overlay['services'][$service]['environment'] ?? [] as $value) {
            if (preg_match_all('/\$\{([A-Z][A-Z0-9_]*)/', (string) $value, $m)) {
                array_push($referenced, ...$m[1]);
            }
        }
    }

    foreach (array_unique($referenced) as $key) {
        expect($exampleKeys)->toContain($key);
    }
});
