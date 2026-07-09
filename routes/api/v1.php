<?php

use App\Http\Controllers\Api\V1\AgentController;
use Illuminate\Support\Facades\Route;

// V1 Endpoints
Route::prefix('v1')->group(function () {
    // Authenticated dashboard routes
    Route::middleware('auth:jwt')->group(function () {
        Route::post('servers/{uuid}/provision', [AgentController::class, 'provision']);
        Route::post('servers/{uuid}/provision/regenerate', [AgentController::class, 'regenerate']);
    });

    // Public / Agent endpoints
    Route::post('provision', [AgentController::class, 'bootstrap']);
    Route::post('register', [AgentController::class, 'register']);
    Route::post('agent/heartbeat', [AgentController::class, 'heartbeat']);
});
