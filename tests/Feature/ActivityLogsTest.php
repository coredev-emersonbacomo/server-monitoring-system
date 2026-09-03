<?php

use App\Models\CustomActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('activity logs expose the performer uuid', function () {
    $user = User::factory()->create();

    CustomActivityLog::create([
        'user_id' => $user->id,
        'user' => $user->name,
        'action' => 'Updated a user',
        'details' => ['message' => 'User updated'],
    ]);

    $response = $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/activity-logs');

    $response->assertSuccessful()
        ->assertJsonPath('data.0.user_id', $user->id)
        ->assertJsonPath('data.0.user_uuid', $user->uuid);
});

test('activity logs validate query params', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/activity-logs?per_page=999')
        ->assertStatus(422);
});

test('activity logs search matches linked performer full name', function () {
    $user = User::factory()->create([
        'first_name' => 'Admin',
        'last_name' => 'Surname',
        'username' => 'admin',
    ]);

    CustomActivityLog::create([
        'user_id' => $user->id,
        'user' => 'admin',
        'action' => 'Updated a server',
        'details' => ['message' => 'Server updated'],
    ]);

    // Search by the user's full name should match via the linked user record,
    // even though the raw `user` column stores only the username.
    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/activity-logs?search='.urlencode('Admin Surname'))
        ->assertSuccessful()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.user_id', $user->id);

    // Searching by only the first name should also match.
    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/activity-logs?search=admin')
        ->assertSuccessful()
        ->assertJsonCount(1, 'data');
});

test('server health logs do not expose a user', function () {
    $user = User::factory()->create([
        'email' => 'health@example.com',
        'password' => bcrypt('password123'),
    ]);

    CustomActivityLog::create([
        'type' => 'server_health',
        'action' => 'Agent Online',
        'details' => ['message' => 'Server came online'],
    ]);

    CustomActivityLog::create([
        'user' => 'System',
        'action' => 'Token Expired',
        'details' => ['message' => 'Token expired'],
    ]);

    $token = $this->postJson('/api/login', [
        'email' => 'health@example.com',
        'password' => 'password123',
    ])->json('access_token');

    $this->withHeaders(['Authorization' => 'Bearer '.$token])
        ->getJson('/api/v1/server-health-logs')
        ->assertSuccessful()
        ->assertJsonPath('data.0.user', null);
});
