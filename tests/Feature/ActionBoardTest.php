<?php

use App\Enums\ServerStatus;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\Server;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function boardUser(): User
{
    return User::factory()->create();
}

function boardServer(string $status): Server
{
    return Server::create([
        'uuid' => Str::uuid()->toString(),
        'client_id' => Client::factory()->create()->id,
        'name' => 'Board Test Server',
        'host_name' => '127.0.0.1',
        'status' => $status,
    ]);
}

test('server_offline auto-clears when the server is already back online', function () {
    $user = boardUser();
    // Unique key is (action_type, server_id, client_id): one item per server.
    $claimedServer = boardServer(ServerStatus::Online->value);
    $unclaimedServer = boardServer(ServerStatus::Online->value);

    $claimed = ActionItem::create([
        'action_type' => 'server_offline',
        'server_id' => $claimedServer->id,
        'client_id' => $claimedServer->client_id,
        'status' => 'open',
        'assigned_to' => $user->id,
        'message' => 'stale offline',
        'severity' => 'critical',
    ]);
    $unclaimed = ActionItem::create([
        'action_type' => 'server_offline',
        'server_id' => $unclaimedServer->id,
        'client_id' => $unclaimedServer->client_id,
        'status' => 'open',
        'assigned_to' => null,
        'message' => 'stale offline',
        'severity' => 'critical',
    ]);

    $response = $this->actingAs($user, 'jwt')->getJson('/api/dashboard/actions');

    $response->assertOk();
    expect($response->json())->toBe([]);
    // Claimed → completed history; unclaimed → deleted.
    expect(ActionItem::find($claimed->id)->status->value)->toBe('completed');
    expect(ActionItem::find($unclaimed->id))->toBeNull();
});

test('server_offline stays listed while the server is still offline', function () {
    $user = boardUser();
    $server = boardServer(ServerStatus::Offline->value);

    ActionItem::create([
        'action_type' => 'server_offline',
        'server_id' => $server->id,
        'client_id' => $server->client_id,
        'status' => 'open',
        'assigned_to' => null,
        'message' => 'live offline',
        'severity' => 'critical',
    ]);

    $response = $this->actingAs($user, 'jwt')->getJson('/api/dashboard/actions');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
});

test('no_secops auto-clears once SecOps is assigned', function () {
    $user = boardUser();
    // Unique key is (action_type, server_id, client_id): one item per client.
    $claimedClient = Client::factory()->create();
    $unclaimedClient = Client::factory()->create();
    foreach ([$claimedClient, $unclaimedClient] as $c) {
        $secops = User::factory()->create();
        $c->secopclients()->attach($secops->id, ['uuid' => Str::uuid()->toString(), 'record_status' => 'active']);
    }

    $claimed = ActionItem::create([
        'action_type' => 'no_secops',
        'server_id' => null,
        'client_id' => $claimedClient->id,
        'status' => 'open',
        'assigned_to' => $user->id,
        'message' => 'stale unassigned',
        'severity' => 'warning',
    ]);
    $unclaimed = ActionItem::create([
        'action_type' => 'no_secops',
        'server_id' => null,
        'client_id' => $unclaimedClient->id,
        'status' => 'open',
        'assigned_to' => null,
        'message' => 'stale unassigned',
        'severity' => 'warning',
    ]);

    $response = $this->actingAs($user, 'jwt')->getJson('/api/dashboard/actions');

    $response->assertOk();
    expect($response->json())->toBe([]);
    expect(ActionItem::find($claimed->id)->status->value)->toBe('completed');
    expect(ActionItem::find($unclaimed->id))->toBeNull();
});

test('no_secops stays listed while the client still has nobody', function () {
    $user = boardUser();
    $client = Client::factory()->create();

    ActionItem::create([
        'action_type' => 'no_secops',
        'server_id' => null,
        'client_id' => $client->id,
        'status' => 'open',
        'assigned_to' => null,
        'message' => 'live unassigned',
        'severity' => 'warning',
    ]);

    $response = $this->actingAs($user, 'jwt')->getJson('/api/dashboard/actions');

    $response->assertOk();
    expect($response->json())->toHaveCount(1);
});
