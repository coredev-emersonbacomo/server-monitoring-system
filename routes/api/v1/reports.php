<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReportController;

Route::middleware('auth:jwt')->group(function () {
    Route::post('/reports/compile', [ReportController::class, 'compile']);
    Route::get('/reports/client/{uuid}', [ReportController::class, 'clientReport']);
    Route::get('/reports/general', [ReportController::class, 'generalReport']);
});
