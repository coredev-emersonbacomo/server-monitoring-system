<?php

use App\Http\Controllers\Api\V1\ServerController;
use App\Http\Controllers\Api\V1\ServerReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/servers', [ServerController::class, 'listAll']);

    Route::prefix('/clients/{clientUuid}')->group(function () {
        Route::post('/servers', [ServerController::class, 'store']);
        Route::get('/servers/{serverUuid}', [ServerController::class, 'show']);
        Route::patch('/servers/{serverUuid}', [ServerController::class, 'update']);
        Route::patch('/servers/{serverUuid}/alert-scope', [ServerController::class, 'updateAlertScope']);
        Route::patch('/servers/{serverUuid}/monitoring', [ServerController::class, 'updateMonitoringConfig']);
        Route::post('/servers/{serverUuid}/detach', [ServerController::class, 'detachFromAgent']);
        Route::post('/servers/{serverUuid}/adjust-cost', [ServerController::class, 'adjustCost']);
        Route::delete('/servers/{serverUuid}', [ServerController::class, 'destroy']);
    });

    Route::get('/servers/{uuid}', [ServerController::class, 'showWithStats']);
    Route::get('/servers/{server:uuid}/report', [ServerReportController::class, 'show']);
});
