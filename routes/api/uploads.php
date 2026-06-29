<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\UploadIntentController;

Route::middleware('auth:jwt')->group(function () {
    Route::post('/upload-intents', [UploadIntentController::class, 'store'])
        ->name('upload-intents.store')
        ->middleware('throttle:30,1');
    Route::get('/upload-intents/{uploadIntent}', [UploadIntentController::class, 'show'])
        ->name('upload-intents.show');
});
