<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| This file is the entry point for all API routes. Routes are split into
| feature-specific files under the routes/api/ directory for organisation.
|
*/

Route::group([], base_path('routes/api/auth.php'));
Route::group([], base_path('routes/api/servers.php'));
