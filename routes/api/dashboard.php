<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

// File path: routes/api/dashboard.php
Route::middleware('auth:jwt')->group(function () {
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/usage', [DashboardController::class, 'usage']);
    Route::get('/dashboard/actions', [DashboardController::class, 'actions']);
    Route::get('/dashboard/actions/completed', [DashboardController::class, 'completed']);
    Route::post('/dashboard/actions/{actionId}/claim', [DashboardController::class, 'claim']);
    Route::post('/dashboard/actions/{actionId}/status', [DashboardController::class, 'updateStatus']);
});
