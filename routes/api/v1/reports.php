<?php

use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::post('/reports/compile', [ReportController::class, 'compile']);
    Route::get('/reports/client/{uuid}', [ReportController::class, 'clientReport']);
    Route::get('/reports/general', [ReportController::class, 'generalReport']);
});
