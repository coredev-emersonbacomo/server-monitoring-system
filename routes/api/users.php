<?php

use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// File path: routes/api/users.php 
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('users', UserController::class);
});
