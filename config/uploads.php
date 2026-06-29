<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Storage Provider
    |--------------------------------------------------------------------------
    |
    | The active storage provider to use for file uploads.
    | Options: cloudinary, s3, r2, gcs, azure, local
    |
    */

    'default_provider' => env('UPLOAD_STORAGE_PROVIDER', 'cloudinary'),

    /*
    |--------------------------------------------------------------------------
    | Provider Configuration
    |--------------------------------------------------------------------------
    |
    | Provider-specific configuration options.
    |
    */

    'providers' => [
        'cloudinary' => [
            'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
            'api_key' => env('CLOUDINARY_API_KEY'),
            'api_secret' => env('CLOUDINARY_API_SECRET'),
            'upload_prefix' => env('CLOUDINARY_UPLOAD_PREFIX', 'https://api.cloudinary.com/v1_1'),
            'delivery_prefix' => env('CLOUDINARY_DELIVERY_PREFIX', 'https://res.cloudinary.com'),

            'transformations' => [
                'profile_pictures' => [
                    'avatar_64' => ['width' => 64, 'height' => 64, 'crop' => 'fill', 'gravity' => 'auto'],
                    'avatar_128' => ['width' => 128, 'height' => 128, 'crop' => 'fill', 'gravity' => 'auto'],
                    'avatar_256' => ['width' => 256, 'height' => 256, 'crop' => 'fill', 'gravity' => 'auto'],
                    'avatar_512' => ['width' => 512, 'height' => 512, 'crop' => 'fill', 'gravity' => 'auto'],
                ],
                'client_banner_images' => [
                    'banner_1200' => ['width' => 1200, 'height' => 300, 'crop' => 'fill', 'gravity' => 'auto'],
                    'banner_1600' => ['width' => 1600, 'height' => 400, 'crop' => 'fill', 'gravity' => 'auto'],
                    'banner_1920' => ['width' => 1920, 'height' => 480, 'crop' => 'fill', 'gravity' => 'auto'],
                ],
            ],
        ],

        'local' => [
            'base_path' => env('LOCAL_STORAGE_BASE_PATH', 'uploads'),
            'delivery_url' => env('LOCAL_DELIVERY_URL', '/storage/uploads'),
        ],

        's3' => [
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'delivery_prefix' => env('AWS_DELIVERY_PREFIX'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Upload Purposes
    |--------------------------------------------------------------------------
    |
    | Define upload behavior per purpose. Each purpose specifies:
    |   - folder:       storage directory prefix
    |   - max_file_size: maximum allowed file size in bytes
    |   - allowed_mime_types: accepted MIME types
    |   - retention_hours: hours before pending intents expire
    |
    */

    'purposes' => [
        'profile_picture' => [
            'folder' => 'profile_pictures',
            'max_file_size' => 5 * 1024 * 1024,
            'allowed_mime_types' => [
                'image/jpeg',
                'image/png',
                'image/webp',
            ],
            'retention_hours' => 24,
        ],

        'client_banner' => [
            'folder' => 'client_banner_images',
            'max_file_size' => 10 * 1024 * 1024,
            'allowed_mime_types' => [
                'image/jpeg',
                'image/png',
                'image/webp',
            ],
            'retention_hours' => 24,
        ],

        'attachment' => [
            'folder' => 'attachments',
            'max_file_size' => 20 * 1024 * 1024,
            'allowed_mime_types' => [
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/pdf',
                'application/zip',
                'text/plain',
                'text/csv',
            ],
            'retention_hours' => 48,
        ],

        'document' => [
            'folder' => 'documents',
            'max_file_size' => 50 * 1024 * 1024,
            'allowed_mime_types' => [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
            'retention_hours' => 48,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Maximum number of upload intent requests per minute per user.
    |
    */

    'rate_limits' => [
        'profile_picture' => 5,
        'client_banner' => 5,
        'attachment' => 20,
        'document' => 10,
    ],
];
