<?php

use App\Http\Controllers\Api\V1\AuditController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    Route::get('/audit/file-activity', [AuditController::class, 'fileActivity']);
    Route::get('/audit/agent-lifecycle', [AuditController::class, 'agentLifecycle']);
});
