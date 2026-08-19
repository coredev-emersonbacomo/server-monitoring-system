<?php

use App\Http\Controllers\Api\V1\JwtAuthController;
use App\Http\Controllers\Api\V1\PasswordResetController;
use App\Http\Controllers\Api\V1\SessionController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [JwtAuthController::class, 'login']);
Route::post('/refresh', [JwtAuthController::class, 'refresh']);

Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword'])->middleware('throttle:3,1');
Route::post('/verify-reset-code', [PasswordResetController::class, 'verifyCode'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordResetController::class, 'resetPassword'])->middleware('throttle:5,1');

Route::middleware('auth:jwt')->group(function () {
    Route::post('/logout', [JwtAuthController::class, 'logout']);
    Route::post('/logout-all', [JwtAuthController::class, 'logoutAll']);
    Route::get('/me', [JwtAuthController::class, 'me']);

    Route::get('/sessions', [SessionController::class, 'index']);
    Route::delete('/sessions/{sessionUuid}', [SessionController::class, 'revoke']);
    Route::post('/sessions/logout-all-others', [SessionController::class, 'revokeAllOthers']);
    Route::delete('/sessions/{sessionUuid}/permanent', [SessionController::class, 'permanentDelete']);
    Route::get('/security-activity', [SessionController::class, 'securityActivity']);
    Route::get('/sessions/active-count', [SessionController::class, 'activeSessionsCount']);
});
