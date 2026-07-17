<?php

use App\Http\Controllers\Api\V1\ServerController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/servers', [ServerController::class, 'listAll']);

    Route::prefix('/clients/{clientUuid}')->group(function () {
        Route::get('/servers', [ServerController::class, 'index']);
        Route::post('/servers', [ServerController::class, 'store']);
        Route::get('/servers/{serverUuid}', [ServerController::class, 'show']);
        Route::patch('/servers/{serverUuid}', [ServerController::class, 'update']);
        Route::patch('/servers/{serverUuid}/alert-scope', [ServerController::class, 'updateAlertScope']);
        Route::delete('/servers/{serverUuid}', [ServerController::class, 'destroy']);
    });

    Route::get('/servers/{uuid}', [ServerController::class, 'showWithStats']);
    Route::delete('/ports/{id}', [ServerController::class, 'destroyPort']);
});

Route::get('/server/{serverId}/minute', [ServerController::class, 'dailyUsage']);
Route::get('/server/{serverId}/{date}', [ServerController::class, 'dayAverage'])
    ->where('date', '\d{4}-\d{2}-\d{2}'); // only match YYYY-MM-DD

