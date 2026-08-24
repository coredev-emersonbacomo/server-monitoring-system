<?php

use App\Models\Client;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class)->group('settings', 'secops');

beforeEach(function () {
    config(['jwt.secret' => 'test-secret-key-32-chars-long-for-testing!']);

    $this->admin = User::factory()->create([
        'email' => 'admin@example.com',
        'password' => bcrypt('password123'),
    ]);

    $this->secop = User::factory()->create([
        'email' => 'secop@example.com',
        'password' => bcrypt('password123'),
    ]);

    $this->client = Client::factory()->create();

    Setting::set('secop_limit_per_client', '2');
});

function loginAs(User $user): string
{
    $response = test()->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password123',
    ]);

    return $response->json('access_token');
}

test('settings index returns key-value settings', function () {
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->getJson('/api/settings');

    $response->assertStatus(200)
        ->assertJson(['secop_limit_per_client' => '2']);
});

test('admin can update settings', function () {
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->putJson('/api/settings', [
        'secop_limit_per_client' => 3,
    ]);

    $response->assertStatus(200)
        ->assertJson(['secop_limit_per_client' => '3']);

    expect(Setting::get('secop_limit_per_client'))->toBe('3');
});

test('settings validation fails if offline threshold is less than heartbeat interval', function () {
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->putJson('/api/settings', [
        'heartbeat_interval' => 10,
        'offline_threshold' => 9,
    ]);

    $response->assertStatus(422)
        ->assertJson([
            'message' => 'Offline threshold must be greater than or equal to the heartbeat interval.',
        ]);
});

test('settings validation passes if offline threshold is greater than or equal to heartbeat interval', function () {
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->putJson('/api/settings', [
        'heartbeat_interval' => 10,
        'offline_threshold' => 11,
    ]);

    $response->assertStatus(200);
});

test('non-admin cannot update settings', function () {
    $token = loginAs($this->secop);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->putJson('/api/settings', [
        'secop_limit_per_client' => 5,
    ]);

    $response->assertStatus(403);
});
test('admin can assign secops to a client within limit', function () {
    $secopTwo = User::factory()->create();
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->postJson("/api/clients/{$this->client->uuid}/secops", [
        'user_uuid' => $this->secop->uuid,
    ]);
    $response->assertStatus(201);

    $responseTwo = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->postJson("/api/clients/{$this->client->uuid}/secops", [
        'user_uuid' => $secopTwo->uuid,
    ]);
    $responseTwo->assertStatus(201);

    $this->assertDatabaseHas('sec_op_clients', [
        'client_id' => $this->client->id,
        'user_id' => $this->secop->id,
        'record_status' => 'active',
    ]);
});

test('assign secops rejects assignments above configured limit', function () {
    $secopTwo = User::factory()->create();
    $secopThree = User::factory()->create();
    $token = loginAs($this->admin);

    // Assign up to the limit (2)
    $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->postJson("/api/clients/{$this->client->uuid}/secops", [
        'user_uuid' => $this->secop->uuid,
    ])->assertStatus(201);

    $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->postJson("/api/clients/{$this->client->uuid}/secops", [
        'user_uuid' => $secopTwo->uuid,
    ])->assertStatus(201);

    // Try assigning a third one (limit is 2)
    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->postJson("/api/clients/{$this->client->uuid}/secops", [
        'user_uuid' => $secopThree->uuid,
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['user_uuid']);
});

test('client secops endpoint returns assigned secops', function () {
    $this->client->secopclients()->attach($this->secop->id, [
        'uuid' => Str::uuid()->toString(),
        'record_status' => 'active',
    ]);
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->getJson("/api/clients/{$this->client->uuid}/secops");

    $response->assertStatus(200)
        ->assertJsonPath('0.uuid', $this->secop->uuid);
});
