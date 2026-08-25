<?php

use App\Services\JwtService;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    config(['jwt.secret' => 'test-secret-key-32-chars-long-for-testing!']);
});

test('generates a valid access token', function () {
    $jwtService = app(JwtService::class);
    $userId = 1;
    $sessionUuid = (string) Str::uuid();

    $token = $jwtService->generateAccessToken($userId, $sessionUuid);
    expect($token)->toBeString()
        ->and(substr_count($token, '.'))->toBe(2);
});

test('validates a correctly generated token', function () {
    $jwtService = app(JwtService::class);
    $userId = 1;
    $sessionUuid = (string) Str::uuid();

    $token = $jwtService->generateAccessToken($userId, $sessionUuid);
    $payload = $jwtService->validateAccessToken($token);

    expect($payload)->not->toBeNull()
        ->and($payload->sub)->toBe($userId)
        ->and($payload->sid)->toBe($sessionUuid)
        ->and($payload->iat)->toBeInt()
        ->and($payload->exp)->toBeInt();
});

test('rejects an invalid token', function () {
    $jwtService = app(JwtService::class);
    $payload = $jwtService->validateAccessToken('invalid.token.here');
    expect($payload)->toBeNull();
});

test('rejects a tampered token', function () {
    $jwtService = app(JwtService::class);
    $userId = 1;
    $sessionUuid = (string) Str::uuid();

    $token = $jwtService->generateAccessToken($userId, $sessionUuid);
    $parts = explode('.', $token);
    $tamperedPayload = base64_encode('{"sub":2,"sid":"fake","iat":123,"exp":9999999999}');
    $tamperedToken = $parts[0].'.'.$tamperedPayload.'.'.$parts[2];

    $payload = $jwtService->validateAccessToken($tamperedToken);
    expect($payload)->toBeNull();
});

test('rejects an expired token', function () {
    config(['jwt.access_ttl' => -1]);
    $jwtService = app(JwtService::class);

    $userId = 1;
    $sessionUuid = (string) Str::uuid();

    $token = $jwtService->generateAccessToken($userId, $sessionUuid);
    $payload = $jwtService->validateAccessToken($token);
    expect($payload)->toBeNull();
});

test('generates refresh token id as ULID', function () {
    $jwtService = app(JwtService::class);
    $id = $jwtService->generateRefreshTokenId();
    expect($id)->toBeString()
        ->and(strlen($id))->toBe(26);
});

test('generates refresh token secret with 256 bits of entropy', function () {
    $jwtService = app(JwtService::class);
    $secret = $jwtService->generateRefreshTokenSecret();
    expect($secret)->toBeString()
        ->and(strlen($secret))->toBe(64)
        ->and(ctype_xdigit($secret))->toBeTrue();
});

test('hashes secret correctly', function () {
    $jwtService = app(JwtService::class);
    $secret = 'test-secret-value';
    $hash = $jwtService->hashSecret($secret);

    expect($hash)->toBeString()
        ->and(strlen($hash))->toBe(64)
        ->and($hash)->toBe(hash('sha256', $secret));
});

test('builds and parses refresh token correctly', function () {
    $jwtService = app(JwtService::class);
    $id = $jwtService->generateRefreshTokenId();
    $secret = $jwtService->generateRefreshTokenSecret();

    $token = $jwtService->buildRefreshToken($id, $secret);
    expect($token)->toBeString()
        ->and(str_contains($token, '.'))->toBeTrue();

    $parsed = $jwtService->parseRefreshToken($token);
    expect($parsed)->not->toBeNull()
        ->and($parsed['id'])->toBe($id)
        ->and($parsed['secret'])->toBe($secret);
});

test('constant time comparison works', function () {
    $jwtService = app(JwtService::class);
    expect($jwtService->constantTimeCompare('abc123', 'abc123'))->toBeTrue()
        ->and($jwtService->constantTimeCompare('abc123', 'xyz789'))->toBeFalse();
});
