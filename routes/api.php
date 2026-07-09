<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// File Path: routes/api.php 
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| This file is the entry point for all API routes. Routes are split into
| feature-specific files under the routes/api/ directory for organisation.
|
*/

Broadcast::routes(['middleware' => [\App\Http\Middleware\JwtAuthenticate::class]]);

Route::prefix('v1')->group(function () {
    Route::group([], base_path('routes/api/v1/auth.php'));
    Route::group([], base_path('routes/api/v1/servers.php'));
    Route::group([], base_path('routes/api/v1/users.php'));
    Route::group([], base_path('routes/api/v1/settings.php'));
    Route::group([], base_path('routes/api/v1/clients.php'));
    Route::group([], base_path('routes/api/v1/dashboard.php'));
    Route::group([], base_path('routes/api/v1/uploads.php'));
    Route::group([], base_path('routes/api/v1/activity-logs.php'));
    Route::group([], base_path('routes/api/v1/agent.php'));
    Route::group([], base_path('routes/api/v1/node-configs.php'));
});
