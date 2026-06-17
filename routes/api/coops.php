<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CoopController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/coops', [CoopController::class, 'index']);
    Route::post('/coops', [CoopController::class, 'store']);
    Route::get('/coops/{id}', [CoopController::class, 'show'])->whereNumber('id');
    Route::put('/coops/{id}', [CoopController::class, 'update'])->whereNumber('id');
    Route::delete('/coops/{id}', [CoopController::class, 'destroy'])->whereNumber('id');
});
