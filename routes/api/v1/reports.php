<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReportController;

Route::middleware('auth:jwt')->group(function () {
    Route::post('/reports/compile', [ReportController::class, 'compile']);
});
