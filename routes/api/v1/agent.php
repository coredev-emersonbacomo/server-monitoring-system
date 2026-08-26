<?php

use App\Http\Controllers\Api\V1\AgentController;
use Illuminate\Support\Facades\Route;

// Authenticated dashboard routes
Route::middleware('auth:jwt')->group(function () {
    Route::post('servers/{uuid}/provision', [AgentController::class, 'provision']);
    Route::post('servers/{uuid}/provision/regenerate', [AgentController::class, 'regenerate']);
    Route::post('servers/{uuid}/force-reinstall', [AgentController::class, 'forceReinstall']);
});

// Public / Agent endpoints
Route::post('provision', [AgentController::class, 'bootstrap']);
Route::post('register', [AgentController::class, 'register']);
Route::post('agent/auth/challenge', [AgentController::class, 'challenge']);
Route::post('agent/auth/verify', [AgentController::class, 'verify']);
Route::post('agent/heartbeat', [AgentController::class, 'heartbeat']);

// Detach a single owned server from the agent. The agent remains installed and
// keeps monitoring its other servers. Only when an agent owns zero servers is
// full agent uninstall (POST /agent/uninstall) applicable.
Route::post('agent/servers/{server_uuid}/uninstall', [AgentController::class, 'detachServer']);

Route::post('agent/uninstall', [AgentController::class, 'uninstall']);
Route::post('agent/error', [AgentController::class, 'agentError']);
