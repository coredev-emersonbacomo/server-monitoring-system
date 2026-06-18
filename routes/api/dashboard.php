<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

// File path: routes/api/dashboard.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
});
