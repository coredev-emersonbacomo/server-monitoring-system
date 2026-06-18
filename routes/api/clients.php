<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ClientController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::get('/clients/{id}', [ClientController::class, 'show'])->whereNumber('id');
    Route::put('/clients/{id}', [ClientController::class, 'update'])->whereNumber('id');
    Route::delete('/clients/{id}', [ClientController::class, 'destroy'])->whereNumber('id');
    Route::get('/clients/{id}/servers', [ClientController::class, 'servers'])->whereNumber('id');
});
