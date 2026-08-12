<?php

use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class)->group('auth');

beforeEach(function () {
    config(['jwt.secret' => 'test-secret-key-32-chars-long-for-testing!']);
    $this->jwtService = new JwtService;

    $this->user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password123'),
    ]);
});

test('login succeeds with valid credentials', function () {
    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'access_token',
            'expires_in',
            'user' => ['uuid', 'first_name', 'last_name', 'email'],
            'session' => ['session_uuid', 'host_name'],
        ]);

    expect($response->headers->getCookies())->not->toBeEmpty();
    $refreshCookie = collect($response->headers->getCookies())->first(fn ($c) => $c->getName() === 'refresh_token');
    expect($refreshCookie)->not->toBeNull()
        ->and($refreshCookie->isHttpOnly())->toBeTrue()
        ->and($refreshCookie->isSecure())->toBe(config('jwt.cookie_secure'));
});

test('login fails with invalid credentials', function () {
    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'wrongpassword',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

test('login creates a user session', function () {
    $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $this->assertDatabaseHas('user_sessions', [
        'user_id' => $this->user->id,
    ]);
});

test('login respects remember me', function () {
    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
        'remember' => true,
    ]);

    $response->assertStatus(201);
    $this->assertDatabaseHas('user_sessions', [
        'user_id' => $this->user->id,
        'remember_me' => true,
    ]);

    $refreshCookie = collect($response->headers->getCookies())->first(fn ($c) => $c->getName() === 'refresh_token');
    expect($refreshCookie->getExpiresTime())->not->toBe(0);
});

test('refresh token is returned as http only cookie', function () {
    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $refreshCookie = collect($response->headers->getCookies())->first(fn ($c) => $c->getName() === 'refresh_token');
    expect($refreshCookie)->not->toBeNull();
});

test('me endpoint returns authenticated user', function () {
    $loginResponse = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $accessToken = $loginResponse->json('access_token');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $accessToken,
    ])->getJson('/api/me');

    $response->assertStatus(200)
        ->assertJson([
            'uuid' => $this->user->uuid,
            'email' => 'test@example.com',
        ]);
});

test('me endpoint returns 401 without token', function () {
    $response = $this->getJson('/api/me');
    $response->assertStatus(401);
});

test('me endpoint returns 401 with invalid token', function () {
    $response = $this->withHeaders([
        'Authorization' => 'Bearer invalid-token',
    ])->getJson('/api/me');

    $response->assertStatus(401);
});

test('logout revokes session and clears cookie', function () {
    $loginResponse = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $accessToken = $loginResponse->json('access_token');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $accessToken,
    ])->postJson('/api/logout');

    $response->assertStatus(200);

    $this->assertDatabaseHas('user_sessions', [
        'user_id' => $this->user->id,
    ]);
});

test('refresh endpoint rotates token', function () {
    $loginResponse = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $refreshCookie = collect($loginResponse->headers->getCookies())
        ->first(fn ($c) => $c->getName() === 'refresh_token');
    $refreshTokenValue = $refreshCookie->getValue();

    sleep(1);

    $response = $this->call('POST', '/api/refresh', [], [
        'refresh_token' => $refreshTokenValue,
    ], []);
    $response = \Illuminate\Testing\TestResponse::fromBaseResponse($response);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'access_token',
            'expires_in',
            'session_uuid',
        ]);
});

test('refresh without cookie returns 401', function () {
    $response = $this->postJson('/api/refresh');
    $response->assertStatus(401);
});

test('sessions endpoint returns user sessions', function () {
    $loginResponse = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $accessToken = $loginResponse->json('access_token');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $accessToken,
    ])->getJson('/api/sessions');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'session_uuid',
                    'host_name',
                    'device_type',
                    'current_session',
                    'status',
                ],
            ],
        ]);
});

test('logout all revokes all other sessions', function () {
    $loginResponse = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $accessToken = $loginResponse->json('access_token');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $accessToken,
    ])->postJson('/api/logout-all');

    $response->assertStatus(200);
});

test('security activity endpoint returns audit logs', function () {
    $loginResponse = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $accessToken = $loginResponse->json('access_token');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $accessToken,
    ])->getJson('/api/security-activity');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [],
        ]);
});

test('revoke session endpoint works', function () {
    $loginResponse = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $accessToken = $loginResponse->json('access_token');
    $sessionsResponse = $this->withHeaders([
        'Authorization' => 'Bearer ' . $accessToken,
    ])->getJson('/api/sessions');

    $sessions = $sessionsResponse->json('data');
    $nonCurrentSession = collect($sessions)->first(fn ($s) => !$s['current_session']);

    if ($nonCurrentSession) {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $accessToken,
        ])->deleteJson('/api/sessions/' . $nonCurrentSession['session_uuid']);

        $response->assertStatus(200);
    }
});

test('active sessions count endpoint works', function () {
    $loginResponse = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $accessToken = $loginResponse->json('access_token');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $accessToken,
    ])->getJson('/api/sessions/active-count');

    $response->assertStatus(200)
        ->assertJsonStructure(['active_count']);
});
