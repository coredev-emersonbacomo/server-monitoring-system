<?php

use App\Http\Middleware\JwtAuthenticate;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

uses(RefreshDatabase::class)->group('auth', 'middleware');

beforeEach(function () {
    config(['jwt.secret' => 'test-secret-key-32-chars-long-for-testing!']);
    $this->jwtService = app(JwtService::class);
    $this->user = User::factory()->create();

    Route::get('/api/_test/middleware', function () {
        return response('ok');
    })->middleware(JwtAuthenticate::class);
});

test('passes request with valid token', function () {
    $sessionUuid = (string) Str::uuid();
    $token = $this->jwtService->generateAccessToken($this->user->id, $sessionUuid);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->getJson('/api/_test/middleware');

    $response->assertStatus(200);
});

test('rejects request without token', function () {
    $response = $this->getJson('/api/_test/middleware');

    $response->assertStatus(401);
});

test('rejects request with invalid token', function () {
    $response = $this->withHeaders([
        'Authorization' => 'Bearer invalid-token',
    ])->getJson('/api/_test/middleware');

    $response->assertStatus(401);
});
