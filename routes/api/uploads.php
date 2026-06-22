<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\UploadSignatureController;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/uploads/profile-picture/signature', [UploadSignatureController::class, 'profilePicture'])
        ->name('uploads.profile-picture.signature');
    Route::post('/uploads/client-banner/signature', [UploadSignatureController::class, 'clientBanner'])
        ->name('uploads.client-banner.signature');
});
