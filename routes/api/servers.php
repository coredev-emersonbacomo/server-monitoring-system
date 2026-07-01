<?php

use App\Http\Controllers\ServerController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/servers', [ServerController::class, 'listAll']);

<<<<<<< Updated upstream
    Route::prefix('/clients/{clientUuid}')->group(function () {
        Route::get('/servers', [ServerController::class, 'index']);
        Route::post('/servers', [ServerController::class, 'store']);
        Route::get('/servers/{serverUuid}', [ServerController::class, 'show']);
        Route::put('/servers/{serverUuid}', [ServerController::class, 'update']);
        Route::delete('/servers/{serverUuid}', [ServerController::class, 'destroy']);
=======
    Route::prefix('/clients/{client}')->group(function () {
        Route::get('/servers', [ServerController::class, 'index']);
        Route::post('/servers', [ServerController::class, 'store']);
        Route::get('/servers/{server}', [ServerController::class, 'show']);
        Route::put('/servers/{server}', [ServerController::class, 'update']);
        Route::delete('/servers/{server}', [ServerController::class, 'destroy']);
>>>>>>> Stashed changes
        Route::post('/servers/uninstall', [ServerController::class, 'uninstallServer']);
    });

<<<<<<< Updated upstream
    Route::get('/servers/{serverUuid}', [ServerController::class, 'showWithStats']);
    Route::post('/server/stats', [ServerController::class, 'ingestStats']);
});
=======
Route::get('/servers/{uuid}', [ServerController::class, 'showWithStats']);
Route::post('/server/stats', [ServerController::class, 'ingestStats']);
>>>>>>> Stashed changes
