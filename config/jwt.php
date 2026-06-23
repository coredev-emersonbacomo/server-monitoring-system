<?php

return [
    'secret' => env('JWT_SECRET'),
    'algo' => 'HS256',
    'access_ttl' => env('JWT_ACCESS_TTL', 15),
    'refresh_ttl' => env('JWT_REFRESH_TTL', 30),
    'issuer' => env('JWT_ISSUER', 'server-monitoring-system'),
    'cookie' => 'refresh_token',
    'cookie_secure' => env('JWT_COOKIE_SECURE', false),
];
