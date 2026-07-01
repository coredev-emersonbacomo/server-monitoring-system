<?php

use App\Http\Controllers\ServerController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/servers', [ServerController::class, 'listAll']);

    Route::prefix('/clients/{clientUuid}')->group(function () {
        Route::get('/servers', [ServerController::class, 'index']);
        Route::post('/servers', [ServerController::class, 'store']);
        Route::get('/servers/{serverUuid}', [ServerController::class, 'show']);
        Route::put('/servers/{serverUuid}', [ServerController::class, 'update']);
        Route::delete('/servers/{serverUuid}', [ServerController::class, 'destroy']);
        Route::post('/servers/uninstall', [ServerController::class, 'uninstallServer']);
    });

    Route::get('/servers/{uuid}', [ServerController::class, 'showWithStats']);
});

// No need to have middle as agent have the API key
Route::post('/server/stats', [ServerController::class, 'ingestStats']);
Route::post('/server/specs', [ServerController::class, 'updateServerSpecs']);
