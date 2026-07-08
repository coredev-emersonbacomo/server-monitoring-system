<?php

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class)->group('user_clients');

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
});

function loginAsUser(User $user): string
{
    $response = test()->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password123',
    ]);

    return $response->json('access_token');
}

test('admin can assign a client to a user', function () {
    $token = loginAsUser($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->postJson("/api/users/{$this->secop->uuid}/clients", [
        'client_uuid' => $this->client->uuid,
    ]);

    $response->assertStatus(201)
        ->assertJson(['message' => 'Client added successfully']);

    $this->assertDatabaseHas('sec_op_clients', [
        'client_id' => $this->client->id,
        'user_id' => $this->secop->id,
        'record_status' => 'active',
    ]);
});

test('can retrieve clients assigned to a user', function () {
    $this->secop->clients()->attach($this->client->id, [
        'uuid' => \Illuminate\Support\Str::uuid()->toString(),
        'record_status' => 'active',
    ]);

    $token = loginAsUser($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->getJson("/api/users/{$this->secop->uuid}/clients");

    $response->assertStatus(200)
        ->assertJsonPath('0.uuid', $this->client->uuid);
});

test('admin can remove a client from a user', function () {
    $this->secop->clients()->attach($this->client->id, [
        'uuid' => \Illuminate\Support\Str::uuid()->toString(),
        'record_status' => 'active',
    ]);

    $token = loginAsUser($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->deleteJson("/api/users/{$this->secop->uuid}/clients/{$this->client->uuid}");

    $response->assertStatus(204);

    $this->assertDatabaseMissing('sec_op_clients', [
        'client_id' => $this->client->id,
        'user_id' => $this->secop->id,
    ]);
});
