<?php

use App\Models\Client;
use App\Models\CustomActivityLog;
use App\Models\Server;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

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

test('activity logs return the standard envelope with page-number prev/next', function () {
    $user = User::factory()->create();

    for ($i = 0; $i < 12; $i++) {
        CustomActivityLog::create([
            'user_id' => $user->id,
            'user' => $user->name,
            'action' => "Action {$i}",
            'details' => ['message' => "log {$i}"],
        ]);
    }

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/activity-logs?per_page=5')
        ->assertSuccessful()
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('prev', null)
        ->assertJsonPath('next', 2)
        ->assertJsonPath('total', 12)
        ->assertJsonPath('per_page', 5);

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/activity-logs?per_page=5&page=3')
        ->assertSuccessful()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('prev', 2)
        ->assertJsonPath('next', null)
        ->assertJsonPath('total', 12);
});

test('activity logs filter by server uuid', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $server = Server::create([
        'uuid' => Str::uuid7()->toString(),
        'client_id' => $client->id,
        'name' => 'log-srv',
        'host_name' => 'log-srv',
        'status' => 'pending_installation',
        'alert_scope' => 'global',
    ]);

    CustomActivityLog::create([
        'user_id' => $user->id,
        'user' => $user->name,
        'action' => 'Linked action',
        'logable_id' => $server->id,
        'logable_type' => Server::class,
        'details' => ['message' => 'linked'],
    ]);
    CustomActivityLog::create([
        'user_id' => $user->id,
        'user' => $user->name,
        'action' => 'Unlinked action',
        'details' => ['message' => 'unlinked'],
    ]);

    $this->actingAs($user, 'jwt')
        ->getJson("/api/v1/activity-logs?server_uuid={$server->uuid}")
        ->assertSuccessful()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.action', 'Linked action');

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/activity-logs?server_uuid='.Str::uuid()->toString())
        ->assertSuccessful()
        ->assertJsonCount(0, 'data');
});
