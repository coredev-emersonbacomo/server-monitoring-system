<?php

use App\Mail\EmailVerificationMail;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

uses(RefreshDatabase::class)->group('auth');

beforeEach(function () {
    config(['jwt.secret' => 'test-secret-key-32-chars-long-for-testing!']);
    config(['app.url' => 'http://localhost']);
    Mail::fake();
    cache()->flush();

    $this->jwtService = new JwtService;

    $this->user = User::factory()->create([
        'email' => 'test@example.com',
        'username' => 'testuser',
        'password' => bcrypt('password123'),
        'email_verified_at' => null,
    ]);
});

test('resend sends verification email for unverified user', function () {
    $login = $this->postJson('/api/login', [
        'email' => $this->user->email,
        'password' => 'password123',
    ])->json('access_token');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$login,
    ])->postJson('/api/v1/email/verification-resend');

    $response->assertStatus(200)
        ->assertJsonStructure(['message', 'masked_email'])
        ->assertJsonPath('masked_email', 't**t@example.com');

    Mail::assertSent(EmailVerificationMail::class, fn ($mail) => $mail->hasTo($this->user->email));
});

test('resend rejects already verified user', function () {
    $this->user->forceFill(['email_verified_at' => now()])->save();
    $login = $this->postJson('/api/login', [
        'email' => $this->user->email,
        'password' => 'password123',
    ])->json('access_token');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$login,
    ])->postJson('/api/v1/email/verification-resend');

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);

    Mail::assertNothingSent();
});

test('verify marks user as verified when signature is valid', function () {
    $url = URL::temporarySignedRoute(
        'email.verify',
        now()->addMinutes(60),
        ['user' => $this->user->uuid],
    );

    $query = parse_url($url, PHP_URL_QUERY);

    $response = $this->get('/api/v1/email/verify'.'?'.$query);

    $response->assertStatus(200)
        ->assertSee('Email Verified');

    $this->assertNotNull($this->user->fresh()->email_verified_at);
});

test('verify returns already verified page for verified user', function () {
    $this->user->forceFill(['email_verified_at' => now()])->save();

    $url = URL::temporarySignedRoute(
        'email.verify',
        now()->addMinutes(60),
        ['user' => $this->user->uuid],
    );

    $query = parse_url($url, PHP_URL_QUERY);

    $response = $this->get('/api/v1/email/verify'.'?'.$query);

    $response->assertStatus(200)
        ->assertSee('Already Verified');
});

test('verify rejects invalid signature', function () {
    $response = $this->get('/api/v1/email/verify'.'?'.http_build_query([
        'user' => $this->user->uuid,
        'signature' => 'invalid-signature-value',
        'expires' => now()->addMinutes(60)->timestamp,
    ]));

    $response->assertStatus(403)
        ->assertSee('Verification Link Invalid');

    $this->assertNull($this->user->fresh()->email_verified_at);
});

test('verify rejects expired signature', function () {
    $url = URL::temporarySignedRoute(
        'email.verify',
        now()->subMinutes(5),
        ['user' => $this->user->uuid],
    );

    $query = parse_url($url, PHP_URL_QUERY);

    $response = $this->get('/api/v1/email/verify'.'?'.$query);

    $response->assertStatus(403)
        ->assertSee('Verification Link Invalid');

    $this->assertNull($this->user->fresh()->email_verified_at);
});
