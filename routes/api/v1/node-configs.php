<?php

use App\NodeConfig\Controllers\NodeConfigController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/node-config-node-types', [NodeConfigController::class, 'nodeTypes']);

    Route::get('/node-configs', [NodeConfigController::class, 'index']);
    Route::post('/node-configs', [NodeConfigController::class, 'store']);

    Route::get('/node-configs/by-slug/{slug}', [NodeConfigController::class, 'findBySlug']);
    Route::put('/node-configs/by-slug/{slug}', [NodeConfigController::class, 'upsertBySlug']);
    Route::get('/node-configs/telemetry-state', [NodeConfigController::class, 'telemetryState']);
    Route::post('/node-configs/preview', [NodeConfigController::class, 'preview']);

    Route::get('/node-configs/{id}', [NodeConfigController::class, 'show']);
    Route::put('/node-configs/{id}', [NodeConfigController::class, 'update']);
    Route::delete('/node-configs/{id}', [NodeConfigController::class, 'destroy']);
    Route::post('/node-configs/{id}/test', [NodeConfigController::class, 'test']);
    Route::post('/node-configs/{id}/reset-state', [NodeConfigController::class, 'resetState']);
});
