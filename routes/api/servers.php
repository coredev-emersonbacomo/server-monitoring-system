<?php

use App\Http\Controllers\ServerController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/servers', [ServerController::class, 'listAll']);

    Route::prefix('/clients/{client}')->group(function () {
        Route::get('/servers', [ServerController::class, 'index']);
        Route::post('/servers', [ServerController::class, 'store']);
        Route::get('/servers/{server}', [ServerController::class, 'show']);
        Route::put('/servers/{server}', [ServerController::class, 'update']);
        Route::delete('/servers/{server}', [ServerController::class, 'destroy']);
        Route::post('/servers/uninstall', [ServerController::class, 'uninstallServer']);
    });
});

Route::get('/servers/{uuid}', [ServerController::class, 'showWithStats']);
Route::post('/server/stats', [ServerController::class, 'ingestStats']);
