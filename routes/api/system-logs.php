<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SystemLogController;

Route::get('/system-logs', [SystemLogController::class, 'index']);
