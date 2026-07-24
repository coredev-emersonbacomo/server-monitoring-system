<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\ClientController;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/clients/{clientUuid}', [ClientController::class, 'show']);
    Route::put('/clients/{clientUuid}', [ClientController::class, 'update']);
    Route::patch('/clients/{clientUuid}/alert-scope', [ClientController::class, 'updateAlertScope']);
    Route::delete('/clients/{clientUuid}', [ClientController::class, 'destroy']);
    Route::get('/clients/{clientUuid}/servers', [ClientController::class, 'servers']);

    // SecOps Management
    Route::get('/clients/{clientUuid}/secops', [ClientController::class, 'secops']);
    Route::post('/clients/{clientUuid}/secops', [ClientController::class, 'addSecop']);
    Route::delete('/clients/{clientUuid}/secops/{userUuid}', [ClientController::class, 'removeSecop']);
});
