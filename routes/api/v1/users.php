<?php

use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

// File path: routes/api/users.php 
Route::middleware('auth:jwt')->group(function () {
    Route::apiResource('users', UserController::class);

    // User Clients Management
    Route::get('/users/{userUuid}/clients', [UserController::class, 'clients']);
    Route::post('/users/{userUuid}/clients', [UserController::class, 'addClient']);
    Route::delete('/users/{userUuid}/clients/{clientUuid}', [UserController::class, 'removeClient']);
});

