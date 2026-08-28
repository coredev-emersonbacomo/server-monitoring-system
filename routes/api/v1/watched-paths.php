<?php

use App\Http\Controllers\Api\V1\WatchedPathController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/watched-paths', [WatchedPathController::class, 'index']);
    Route::post('/watched-paths', [WatchedPathController::class, 'store']);
    Route::get('/watched-paths/{id}', [WatchedPathController::class, 'show']);
    Route::put('/watched-paths/{id}', [WatchedPathController::class, 'update']);
    Route::delete('/watched-paths/{id}', [WatchedPathController::class, 'destroy']);
});
