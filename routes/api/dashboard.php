<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

// File path: routes/api/dashboard.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/actions', [DashboardController::class, 'actions']);
    Route::get('/dashboard/actions/completed', [DashboardController::class, 'completed']);
    Route::post('/dashboard/actions/{action}/claim', [DashboardController::class, 'claim']);
    Route::post('/dashboard/actions/{action}/status', [DashboardController::class, 'updateStatus']);
});
