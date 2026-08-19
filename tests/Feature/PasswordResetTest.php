<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class)->group('auth');

beforeEach(function () {
    Mail::fake();
    cache()->flush();

    $this->user = User::factory()->create([
        'email' => 'admin@coredev.ph',
        'username' => 'admin',
        'password' => bcrypt('password123'),
    ]);
});

test('forgot password returns masked email with visible domain', function () {
    $response = $this->postJson('/api/v1/forgot-password', [
        'email' => 'admin@coredev.ph',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['message', 'masked_email']);

    expect($response->json('masked_email'))
        ->toContain('coredev.ph')
        ->toBe('a***n@coredev.ph');
});

test('forgot password with non-existent email shows masked domain of input', function () {
    $response = $this->postJson('/api/v1/forgot-password', [
        'email' => 'someone@other-domain.com',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('masked_email', 's*****e@other-domain.com');
});

test('forgot password with username finds user and shows masked real email', function () {
    $response = $this->postJson('/api/v1/forgot-password', [
        'email' => 'admin',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('masked_email', 'a***n@coredev.ph');
});

test('forgot password with username input when user not found returns all stars', function () {
    $response = $this->postJson('/api/v1/forgot-password', [
        'email' => 'ghostuser',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('masked_email', '*****@*****.**');
});
