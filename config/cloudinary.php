<?php

return [
    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
    'api_key' => env('CLOUDINARY_API_KEY'),
    'api_secret' => env('CLOUDINARY_API_SECRET'),

    'folders' => [
        'profile_pictures' => 'profile_pictures',
        'client_banners' => 'client_banner_images',
    ],

    'transformations' => [
        'profile_pictures' => [
            'avatar_64' => ['width' => 64, 'height' => 64, 'crop' => 'fill', 'gravity' => 'auto'],
            'avatar_128' => ['width' => 128, 'height' => 128, 'crop' => 'fill', 'gravity' => 'auto'],
            'avatar_256' => ['width' => 256, 'height' => 256, 'crop' => 'fill', 'gravity' => 'auto'],
            'avatar_512' => ['width' => 512, 'height' => 512, 'crop' => 'fill', 'gravity' => 'auto'],
        ],
        'client_banners' => [
            'banner_1200' => ['width' => 1200, 'height' => 300, 'crop' => 'fill', 'gravity' => 'auto'],
            'banner_1600' => ['width' => 1600, 'height' => 400, 'crop' => 'fill', 'gravity' => 'auto'],
            'banner_1920' => ['width' => 1920, 'height' => 480, 'crop' => 'fill', 'gravity' => 'auto'],
        ],
    ],

    'max_file_sizes' => [
        'profile_pictures' => 5 * 1024 * 1024,
        'client_banners' => 10 * 1024 * 1024,
    ],

    'allowed_mime_types' => ['image/jpeg', 'image/png', 'image/webp'],
];
