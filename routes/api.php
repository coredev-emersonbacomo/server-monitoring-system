<?php

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

Route::group([], base_path('routes/api/auth.php'));
Route::group([], base_path('routes/api/servers.php'));
Route::group([], base_path('routes/api/users.php'));
Route::group([], base_path('routes/api/clients.php'));
Route::group([], base_path('routes/api/dashboard.php'));
Route::group([], base_path('routes/api/uploads.php'));
