<?php

use App\Http\Controllers\Api\V1\ActivityLogController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
});
