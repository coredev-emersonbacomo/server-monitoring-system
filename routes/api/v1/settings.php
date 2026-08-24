<?php

use App\Http\Controllers\Api\V1\GlobalAlertController;
use App\Http\Controllers\Api\V1\SettingController;
use Illuminate\Support\Facades\Route;

// File path: routes/api/settings.php
Route::middleware('auth:jwt')->group(function () {
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);

    Route::get('/global-alerts', [GlobalAlertController::class, 'index']);
    Route::put('/global-alerts', [GlobalAlertController::class, 'update']);
});
