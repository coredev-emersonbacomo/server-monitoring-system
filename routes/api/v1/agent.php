<?php

use App\Http\Controllers\Api\V1\AgentController;
use Illuminate\Support\Facades\Route;

// Authenticated dashboard routes
Route::middleware('auth:jwt')->group(function () {
    Route::post('servers/{uuid}/provision', [AgentController::class, 'provision']);
    Route::post('servers/{uuid}/provision/regenerate', [AgentController::class, 'regenerate']);
});

// Public / Agent endpoints
Route::post('provision', [AgentController::class, 'bootstrap']);
Route::post('register', [AgentController::class, 'register']);
Route::post('agent/heartbeat', [AgentController::class, 'heartbeat']);
Route::post('agent/uninstall', [AgentController::class, 'uninstall']);
