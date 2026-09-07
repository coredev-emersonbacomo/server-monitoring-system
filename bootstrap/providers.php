<?php

use App\Providers\AppServiceProvider;
use App\Providers\AuthServiceProvider;
use App\Providers\TelescopeServiceProvider;
use Laravel\Telescope\TelescopeApplicationServiceProvider;
use Tpetry\PostgresqlEnhanced\PostgresqlEnhancedServiceProvider;

$providers = [
    AppServiceProvider::class,
    AuthServiceProvider::class,
    PostgresqlEnhancedServiceProvider::class,
];

// Telescope is a dev-only package (require-dev). Prod images install
// --no-dev, so skip registration when the vendor class is absent.
if (class_exists(TelescopeApplicationServiceProvider::class)) {
    $providers[] = TelescopeServiceProvider::class;
}

return $providers;
