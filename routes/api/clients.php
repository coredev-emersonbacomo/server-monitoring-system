<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ClientController;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
<<<<<<< Updated upstream
    Route::get('/clients/{clientUuid}', [ClientController::class, 'show']);
    Route::put('/clients/{clientUuid}', [ClientController::class, 'update']);
    Route::delete('/clients/{clientUuid}', [ClientController::class, 'destroy']);
    Route::get('/clients/{clientUuid}/servers', [ClientController::class, 'servers']);

    // SecOps Management
    Route::get('/clients/{clientUuid}/secops', [ClientController::class, 'secops']);
    Route::post('/clients/{clientUuid}/secops', [ClientController::class, 'addSecop']);
    Route::delete('/clients/{clientUuid}/secops/{userId}', [ClientController::class, 'removeSecop'])->whereNumber('userId');
=======
    Route::get('/clients/{uuid}', [ClientController::class, 'show']);
    Route::put('/clients/{uuid}', [ClientController::class, 'update']);
    Route::delete('/clients/{uuid}', [ClientController::class, 'destroy']);
    Route::get('/clients/{client}/servers', [ClientController::class, 'servers']);
    Route::post('/clients/{client}/servers', [ClientController::class, 'initializeServer']);

    // SecOps Management
    Route::get('/clients/{client}/secops', [ClientController::class, 'secops']);
    Route::post('/clients/{client}/secops', [ClientController::class, 'addSecop']);
    Route::delete('/clients/{client}/secops/{userId}', [ClientController::class, 'removeSecop'])->whereNumber('userId');
>>>>>>> Stashed changes
});
