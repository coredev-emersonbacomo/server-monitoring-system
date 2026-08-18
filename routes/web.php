<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AgentController;

// When `npm start` has deployed the SPA into public/, serve it at the root.
Route::get('/', function () {
    $spa = public_path('index.html');
    return file_exists($spa) ? response()->file($spa) : view('welcome');
});

Route::get('/install/linux', [AgentController::class, 'installLinux']);
Route::get('/install/windows.ps1', [AgentController::class, 'installWindows']);
Route::get('/uninstall/linux', [AgentController::class, 'uninstallLinux']);
Route::get('/uninstall/windows.ps1', [AgentController::class, 'uninstallWindows']);

// Serve the SPA for client-side routes, but keep API 404s as JSON.
Route::fallback(function (Request $request) {
    if (str_starts_with($request->path(), 'api/')) {
        return response()->json(['message' => 'Not Found'], 404);
    }
    $spa = public_path('index.html');
    return file_exists($spa) ? response()->file($spa) : abort(404);
});
