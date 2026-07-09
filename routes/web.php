<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AgentController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/install/linux', [AgentController::class, 'installLinux']);
Route::get('/install/windows.ps1', [AgentController::class, 'installWindows']);
