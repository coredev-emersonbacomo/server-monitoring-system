<?php

use App\Enums\ServerStatus;
use App\Models\Agent;
use App\Models\Client;
use App\Models\ProvisionToken;
use App\Models\Server;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// Fixed test keypair so the suite is deterministic and independent of the
// machine's OpenSSL configuration. Not a secret — a test fixture only.
const AGENT_TEST_PRIVATE_KEY = <<<'PEM'
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3fnFZWVGKYc7u
6tQ5GNuDwO6cpRa9UYRv5aC2m6IPgqflVgiwjcyyaILDnFoTMBkdWXgNnFTVpHix
31LQlXUjp0okdaumt93oS+mRqUkrd6Ulw3bboRY27cRuVWOKZNvTcIb0XgS98fyV
iuXmvz8iWAtMwOI6EoenFEEW8sAgqD8cCahKFjxwEjOTxT4U9dxre2PWUY8f+A5Q
ag24cC/L8KjaMO1CpxRKWko0pVxj6T1p65CKuvj7ue745WFyBU9CquDbz7rnMOAn
SlMR9gLLHkgU/tUgSYfmz0y7APuV4b4DPjHEBEQzbk/FJMHMkgIm+QhGDMblABAB
hCZbf+aJAgMBAAECggEAAc7KGReV2RIrnWj3hvR6vSqPxJVPywpcOVSpfQMS2VTv
3do3eF3SmsiyznCM5qF+WIQCzceGLRtTYRU9K0w9p4iaD2U6uAgZtJSC4ZTUYWGV
YUYytpPjXyPVNUJmxPycudGNqCdWTp9tXfUiB2BHo/P6xdp59W6B+EsXymfBLXvW
jr53UYh3xu5tiCwxI2gVL7HQAHrInnkzODEN1ZXfnp8g+997Uf71OO8lDglugVyJ
rL/B7v2N6mI/0mMxopeZOWyS722CEi7Q09Z3mHr6izJOnwiV5aTuQOz4C+loQx6B
oMsd9xDnmnNlrXCsNcXNgAESQ498sAjO8lG69E7WgQKBgQDzTFuc4cuddc5ppg9U
ttcjmC7ZC/eyod5geZfhUxhHysohlC7mHXBesfn9V2zBYLMZgZH6HoqkSvOUkMD7
1mkRokUaLYP6Yx8ZXf2lKJO5IcAmIgem0oV+rWiV+LnF0W3Z2fYKI0vUKFgki11U
Vqn3WfqZ0l0mAFWqmr11k3x5kQKBgQDBEs8xVqqUpIq1eDHjti9nXnedku1yytOf
Ry7xEL4ehhL+FmByqz+99twCYmF+SHKoFtUFiiDnrjLHDoeCous3AmkR4YgVwGF3
fmDcUlurhmdS+oyNgJWv8FvjNoixqOwgtIz5sdI1WqYLLLAsZFLao0SizWQydmCG
Qm1fOLLheQKBgDqvcGmnDTYt9FwHcis87yfmzWYNPPIZmUosCjaPlIu8noT6+VUI
RNKSm3pAXDtI1+qPFmb+dvKqIZb0U5hrX2yhd4mY8Py0bAvyX/w2jWtaeL659p6G
qSylJ1UFacoNejHSIUbQvLmwAZLPCvQM83J2gbwYwd8otYExUgHKUXwBAoGABH+i
sjyZtuLqlHXbe7nH+vmZgeNlgvI04hYvgtBoDaAEG0V8M8/HqW5yC+As81tOyJnX
lsx0HdHSPw8YmzOelWaJ+i+uEwurebRJH3kPx7xW9fj+g2GGm1XXXkDsCG+uKMjs
K/k3s6SMD+CXrkEcKRn6xGxStFZLw3USxVA14skCgYEAvDoEo2E/7BEN2znCNByg
nMLeoeZs3tZ5Wlw/Hhy0x4PPxJTjUUL4muLXzk9Cav57wahiEW6AUeqR8qtF4dyu
153ah9Mr9BDMms6BIM6Po0DHAxq7Grb47DQfuWcSy4clVqYYZdEBrLsAaPQbDPOw
U3QDs32S0yrvzlsgjrMg8DY=
-----END PRIVATE KEY-----
PEM;

const AGENT_TEST_PUBLIC_KEY_PEM = <<<'PEM'
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt35xWVlRimHO7urUORjb
g8DunKUWvVGEb+WgtpuiD4Kn5VYIsI3MsmiCw5xaEzAZHVl4DZxU1aR4sd9S0JV1
I6dKJHWrprfd6EvpkalJK3elJcN226EWNu3EblVjimTb03CG9F4EvfH8lYrl5r8/
IlgLTMDiOhKHpxRBFvLAIKg/HAmoShY8cBIzk8U+FPXca3tj1lGPH/gOUGoNuHAv
y/Co2jDtQqcUSlpKNKVcY+k9aeuQirr4+7nu+OVhcgVPQqrg28+65zDgJ0pTEfYC
yx5IFP7VIEmH5s9MuwD7leG+Az4xxAREM25PxSTBzJICJvkIRgzG5QAQAYQmW3/m
iQIDAQAB
-----END PUBLIC KEY-----
PEM;

function agentKeyPair(): array
{
    $lines = array_filter(array_map('trim', explode("\n", AGENT_TEST_PUBLIC_KEY_PEM)), fn ($l) => $l !== '' && ! str_starts_with($l, '---'));
    $der = base64_decode(implode('', $lines));

    return [
        'private_key' => AGENT_TEST_PRIVATE_KEY,
        'public_key' => base64_encode($der),
        'public_key_hash' => hash('sha256', $der),
    ];
}

function signChallenge(string $privateKeyPem, string $challenge): string
{
    $key = openssl_pkey_get_private($privateKeyPem);
    openssl_sign($challenge, $signature, $key, OPENSSL_ALGO_SHA256);

    return base64_encode($signature);
}

function testInstallationId(string $suffix = '001'): string
{
    return "7f6e6f9e-0000-4000-8000-000000000{$suffix}";
}

test('end-to-end agent provisioning, key registration, challenge-response auth, and heartbeat flow', function () {
    // 1. Arrange: Create user, client, and server
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $server = Server::create([
        'client_id' => $client->id,
        'name' => 'Web App Production',
        'host_name' => 'webapp-prod',
        'status' => ServerStatus::PendingInstallation->value,
    ]);

    // 2. Act: Generate provision token
    $response = $this->actingAs($user, 'jwt')
        ->postJson("/api/v1/servers/{$server->uuid}/provision");

    $response->assertStatus(201)
        ->assertJsonStructure([
            'token',
            'expires_at',
            'linux_command',
            'windows_command',
        ]);

    $token = $response->json('token');
    expect($server->fresh()->status)->toBe(ServerStatus::WaitingForInstallation->value);

    // 3. Act: Bootstrap request (Installer starts)
    $bootstrapResponse = $this->postJson('/api/v1/provision', [
        'token' => $token,
        'hostname' => 'webapp-prod',
        'platform' => 'linux',
        'architecture' => 'x86_64',
        'installer_version' => '1.0',
    ]);

    $bootstrapResponse->assertStatus(200)
        ->assertJsonStructure([
            'download_url',
            'expected_sha256',
            'agent_version',
            'server_url',
        ])->assertJsonMissingPath('api_url')
        ->assertJsonMissingPath('register_url');

    // 4. Act: Agent generates its keypair locally and registers only the public key
    $keys = agentKeyPair();

    $installationId = testInstallationId();

    $registerResponse = $this->postJson('/api/v1/register', [
        'token' => $token,
        'installation_id' => $installationId,
        'public_key' => $keys['public_key'],
        'public_key_hash' => $keys['public_key_hash'],
        'agent_version' => '3.0',
        'capabilities' => ['metrics.cpu', 'metrics.memory'],
        'hostname' => 'webapp-prod',
        'operating_system' => 'Ubuntu 24.04',
        'architecture' => 'x86_64',
    ]);

    $registerResponse->assertStatus(200)
        ->assertJson(['registered' => true]);

    $agent = Agent::where('server_id', $server->id)->where('status', 'active')->first();
    expect($agent)->not->toBeNull()
        ->and($agent->installation_uuid)->toBe($installationId)
        ->and($agent->public_key)->toBe($keys['public_key'])
        ->and($agent->public_key_hash)->toBe($keys['public_key_hash'])
        ->and($agent->status)->toBe('active');
    expect($server->fresh()->status)->toBe(ServerStatus::WaitingForFirstHeartbeat->value);

    // Provision token must now be consumed (single use)
    $usedToken = ProvisionToken::where('token', $token)->first();
    expect($usedToken->status)->toBe('used');

    // 5. Act: Challenge-response authentication
    $challengeResponse = $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ]);

    $challengeResponse->assertStatus(200)
        ->assertJsonStructure([
            'challenge_id',
            'challenge',
            'expires_in',
        ]);

    $challenge = $challengeResponse->json('challenge');
    $challengeId = $challengeResponse->json('challenge_id');

    $verifyResponse = $this->postJson('/api/v1/agent/auth/verify', [
        'challenge_id' => $challengeId,
        'signature' => signChallenge($keys['private_key'], $challenge),
    ]);

    $verifyResponse->assertStatus(200)
        ->assertJsonStructure([
            'access_token',
            'expires_in',
            'server_uuid',
            'servers',
            'config' => [
                'heartbeat_interval',
                'realtime' => ['host', 'port', 'scheme', 'app_key'],
            ],
        ]);

    $accessToken = $verifyResponse->json('access_token');

    // The servers list carries the server the agent monitors, with null
    // filters meaning "report everything noise-filtered".
    $servers = $verifyResponse->json('servers');
    expect($servers)->toHaveCount(1)
        ->and($servers[0]['server_uuid'])->toBe($server->uuid)
        ->and($servers[0]['port_filter'])->toBeNull()
        ->and($servers[0]['process_filter'])->toBeNull();

    // 6. Act: Agent heartbeat with the short-lived access token (first heartbeat → Online)
    $heartbeatResponse = $this->withHeaders([
        'Authorization' => 'Bearer '.$accessToken,
    ])->postJson('/api/v1/agent/heartbeat', [
        'server_uuid' => $server->uuid,
        'agent_version' => '3.0',
        'configuration_version' => 1,
        'timestamp' => now()->timestamp,
        'cpu' => [
            'load1' => 0.5,
            'load5' => 0.3,
            'load15' => 0.1,
        ],
        'memory' => [
            'percent' => 45.2,
            'used_kb' => 1800000,
            'total_kb' => 4000000,
        ],
        'disk' => [
            'percent' => 30.0,
            'used' => 30000000000,
            'total' => 100000000000,
        ],
        'uptime' => 3600,
        'open_db_ports' => [
            ['port' => 3306, 'protocol' => 'tcp', 'process' => 'mysqld'],
            ['port' => 8080, 'protocol' => 'tcp', 'process' => 'nginx'],
        ],
    ]);

    $heartbeatResponse->assertStatus(200)
        ->assertJsonStructure([
            'heartbeat_interval',
            'current_time',
            'pending_commands',
            'server_uuid',
        ])
        ->assertJson([
            'server_uuid' => $server->uuid,
            'port_filter' => null,
            'process_filter' => null,
        ]);

    expect($server->fresh()->status)->toBe(ServerStatus::Online->value);
});

test('a challenge can only be used once (replay protection)', function () {
    [$user, $client, $server, $keys, $installationId] = setupRegisteredAgent();

    $challengeResponse = $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ]);
    $challengeId = $challengeResponse->json('challenge_id');

    $signature = signChallenge($keys['private_key'], $challengeResponse->json('challenge'));

    $this->postJson('/api/v1/agent/auth/verify', [
        'challenge_id' => $challengeId,
        'signature' => $signature,
    ])->assertStatus(200);

    // Replaying the same challenge/signature pair must be rejected.
    $this->postJson('/api/v1/agent/auth/verify', [
        'challenge_id' => $challengeId,
        'signature' => $signature,
    ])->assertStatus(401);
});

test('a revoked agent cannot obtain session credentials', function () {
    [$user, $client, $server, $keys, $installationId] = setupRegisteredAgent();

    $agent = $server->fresh()->agent;
    $agent->update(['status' => 'revoked', 'revoked_at' => now()]);

    $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ])->assertStatus(403);
});

test('a revoked agent cannot heartbeat even with a prior token', function () {
    [$user, $client, $server, $keys, $installationId] = setupRegisteredAgent();

    // Obtain a valid session token first.
    $challengeResponse = $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ]);
    $verifyResponse = $this->postJson('/api/v1/agent/auth/verify', [
        'challenge_id' => $challengeResponse->json('challenge_id'),
        'signature' => signChallenge($keys['private_key'], $challengeResponse->json('challenge')),
    ])->assertStatus(200);
    $accessToken = $verifyResponse->json('access_token');

    // Revoke the agent, then heartbeat → rejected.
    $server->fresh()->agent->update(['status' => 'revoked', 'revoked_at' => now()]);

    $this->withHeaders(['Authorization' => 'Bearer '.$accessToken])
        ->postJson('/api/v1/agent/heartbeat', ['timestamp' => now()->timestamp])
        ->assertStatus(401);
});

function setupRegisteredAgent(): array
{
    $user = User::factory()->create();
    $client = Client::factory()->create();
    $server = Server::create([
        'client_id' => $client->id,
        'name' => 'Auth Test Server',
        'host_name' => 'auth-test',
        'status' => ServerStatus::PendingInstallation->value,
    ]);

    $token = $server->provisionTokens()->create([
        'token' => 'test_provision_'.str()->random(32),
        'status' => 'active',
        'expires_at' => now()->addHour(),
    ])->token;

    $keys = agentKeyPair();
    $installationId = testInstallationId();
    test()->postJson('/api/v1/register', [
        'token' => $token,
        'installation_id' => $installationId,
        'public_key' => $keys['public_key'],
        'public_key_hash' => $keys['public_key_hash'],
        'agent_version' => '3.0',
    ])->assertStatus(200);

    return [$user, $client, $server, $keys, $installationId];
}

function createProvisionToken(Server $server): string
{
    return $server->provisionTokens()->create([
        'token' => 'test_provision_'.str()->random(32),
        'status' => 'active',
        'expires_at' => now()->addHour(),
    ])->token;
}

test('a second installation on the same server revokes the first — only one active agent ever exists', function () {
    [$user, $client, $server] = setupRegisteredAgent();

    $oldInstallationId = testInstallationId('001');
    $newInstallationId = testInstallationId('002');

    // A different installation (new UUID) takes over the same server.
    $keys = agentKeyPair();
    $newToken = createProvisionToken($server);
    $this->postJson('/api/v1/register', [
        'token' => $newToken,
        'installation_id' => $newInstallationId,
        'public_key' => $keys['public_key'],
        'public_key_hash' => $keys['public_key_hash'],
        'agent_version' => '3.0',
    ])->assertStatus(200)->assertJson(['registered' => true]);

    $active = Agent::where('server_id', $server->id)->where('status', 'active')->get();
    expect($active)->toHaveCount(1)
        ->and($active->first()->installation_uuid)->toBe($newInstallationId);

    $old = Agent::where('installation_uuid', $oldInstallationId)->first();
    expect($old->status)->toBe('revoked')
        ->and($old->revoked_at)->not->toBeNull();

    // The old installation's identity can no longer authenticate.
    $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $oldInstallationId,
    ])->assertStatus(403);
});

test('one installation monitors multiple servers (multi-server)', function () {
    [$user, $client, $server] = setupRegisteredAgent();

    $installationId = testInstallationId('001');

    // The SAME installation UUID registers a second, brand-new server.
    $otherServer = Server::create([
        'client_id' => $client->id,
        'name' => 'Other Server',
        'host_name' => 'other',
        'status' => ServerStatus::PendingInstallation->value,
    ]);
    $otherToken = createProvisionToken($otherServer);

    $keys = agentKeyPair();
    $this->postJson('/api/v1/register', [
        'token' => $otherToken,
        'installation_id' => $installationId,
        'public_key' => $keys['public_key'],
        'public_key_hash' => $keys['public_key_hash'],
        'agent_version' => '3.0',
    ])->assertStatus(200)->assertJson(['registered' => true]);

    // One agent, now owning both servers.
    $agent = Agent::where('installation_uuid', $installationId)->where('status', 'active')->first();
    expect($agent->monitoredServers->pluck('id')->all())->toContain($server->id, $otherServer->id);

    // A challenge from that installation yields BOTH servers in the session.
    $challengeResponse = $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ]);
    $verifyResponse = $this->postJson('/api/v1/agent/auth/verify', [
        'challenge_id' => $challengeResponse->json('challenge_id'),
        'signature' => signChallenge($keys['private_key'], $challengeResponse->json('challenge')),
    ])->assertStatus(200);

    $uuids = collect($verifyResponse->json('servers'))->pluck('server_uuid');
    expect($uuids)->toContain($server->uuid, $otherServer->uuid);
});

test('per-server filter config is delivered to the agent and updated via the monitoring endpoint', function () {
    [$user, $client, $server, $keys, $installationId] = setupRegisteredAgent();

    // SecOps curates the filter on the server detail page.
    $this->actingAs($user, 'jwt')
        ->patchJson("/api/v1/clients/{$client->uuid}/servers/{$server->uuid}/monitoring", [
            'port_filter' => [3306, 5432],
            'process_filter' => ['mysqld', 'postgres'],
        ])->assertStatus(200)
        ->assertJson([
            'port_filter' => [3306, 5432],
            'process_filter' => ['mysqld', 'postgres'],
        ]);

    // The next session carries the curated lists to the agent.
    $challengeResponse = $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ]);
    $servers = $this->postJson('/api/v1/agent/auth/verify', [
        'challenge_id' => $challengeResponse->json('challenge_id'),
        'signature' => signChallenge($keys['private_key'], $challengeResponse->json('challenge')),
    ])->assertStatus(200)->json('servers');

    $thisServer = collect($servers)->firstWhere('server_uuid', $server->uuid);
    expect($thisServer['port_filter'])->toBe([3306, 5432])
        ->and($thisServer['process_filter'])->toBe(['mysqld', 'postgres']);

    // Resetting with explicit null restores "monitor everything".
    $this->actingAs($user, 'jwt')
        ->patchJson("/api/v1/clients/{$client->uuid}/servers/{$server->uuid}/monitoring", [
            'port_filter' => null,
            'process_filter' => null,
        ])->assertStatus(200)
        ->assertJson([
            'port_filter' => null,
            'process_filter' => null,
        ]);
});

test('an agent cannot heartbeat a server it does not own', function () {
    [$user, $client, $server, $keys, $installationId] = setupRegisteredAgent();

    // A second server belongs to a different agent installation.
    $otherServer = Server::create([
        'client_id' => $client->id,
        'name' => 'Other Server',
        'host_name' => 'other',
        'status' => ServerStatus::PendingInstallation->value,
    ]);
    $keys2 = agentKeyPair();
    $this->postJson('/api/v1/register', [
        'token' => createProvisionToken($otherServer),
        'installation_id' => testInstallationId('002'),
        'public_key' => $keys2['public_key'],
        'public_key_hash' => $keys2['public_key_hash'],
        'agent_version' => '3.0',
    ])->assertStatus(200);

    $challengeResponse = $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ]);
    $accessToken = $this->postJson('/api/v1/agent/auth/verify', [
        'challenge_id' => $challengeResponse->json('challenge_id'),
        'signature' => signChallenge($keys['private_key'], $challengeResponse->json('challenge')),
    ])->json('access_token');

    // Agent 001 must not be able to report on a server owned by agent 002.
    $this->withHeaders(['Authorization' => 'Bearer '.$accessToken])
        ->postJson('/api/v1/agent/heartbeat', [
            'server_uuid' => $otherServer->uuid,
            'timestamp' => now()->timestamp,
        ])->assertStatus(403);
});

test('uninstall revokes the agent and archives the server — no resurrection', function () {
    [$user, $client, $server, $keys, $installationId] = setupRegisteredAgent();

    // Obtain a valid session token.
    $challengeResponse = $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ]);
    $verifyResponse = $this->postJson('/api/v1/agent/auth/verify', [
        'challenge_id' => $challengeResponse->json('challenge_id'),
        'signature' => signChallenge($keys['private_key'], $challengeResponse->json('challenge')),
    ])->assertStatus(200);
    $accessToken = $verifyResponse->json('access_token');

    // The agent calls the uninstall endpoint with its own session token.
    $this->withHeaders(['Authorization' => 'Bearer '.$accessToken])
        ->postJson('/api/v1/agent/uninstall', ['reason' => 'test'])
        ->assertStatus(200);

    $agent = $server->fresh()->agent; // agent() only resolves ACTIVE agents
    expect($agent)->toBeNull();

    $stored = Agent::where('installation_uuid', $installationId)->first();
    expect($stored->status)->toBe('revoked')
        ->and($stored->revoked_at)->not->toBeNull();

    $server = $server->fresh();
    expect($server->agent_deleted)->toBeTrue()
        ->and($server->status)->toBe(ServerStatus::Archived->value);

    // The revoked identity cannot challenge again.
    $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ])->assertStatus(403);

    // A revoked agent's old session token is now rejected outright (401), so
    // it can never push the decommissioned server back Online.
    $this->withHeaders(['Authorization' => 'Bearer '.$accessToken])
        ->postJson('/api/v1/agent/heartbeat', ['timestamp' => now()->timestamp])
        ->assertStatus(401);
});

test('reinstall with the same installation UUID after uninstall reactivates in place', function () {
    [$user, $client, $server, $keys, $installationId] = setupRegisteredAgent();

    // Uninstall → agent revoked, server archived.
    $challengeResponse = $this->postJson('/api/v1/agent/auth/challenge', [
        'installation_uuid' => $installationId,
    ]);
    $accessToken = $this->postJson('/api/v1/agent/auth/verify', [
        'challenge_id' => $challengeResponse->json('challenge_id'),
        'signature' => signChallenge($keys['private_key'], $challengeResponse->json('challenge')),
    ])->json('access_token');
    $this->withHeaders(['Authorization' => 'Bearer '.$accessToken])
        ->postJson('/api/v1/agent/uninstall')->assertStatus(200);

    $revokedId = Agent::where('installation_uuid', $installationId)->first()->id;

    // The server is re-provisioned (unarchived) and the SAME installation
    // re-registers with its original UUID.
    $server->update([
        'agent_deleted' => false,
        'status' => ServerStatus::PendingInstallation->value,
    ]);
    $newToken = createProvisionToken($server);
    $this->postJson('/api/v1/register', [
        'token' => $newToken,
        'installation_id' => $installationId,
        'public_key' => $keys['public_key'],
        'public_key_hash' => $keys['public_key_hash'],
        'agent_version' => '3.1',
    ])->assertStatus(200)->assertJson(['registered' => true]);

    // The same agent ROW is reactivated — no duplicate, no orphaned historical row.
    $agent = Agent::where('installation_uuid', $installationId)->first();
    expect($agent->id)->toBe($revokedId)
        ->and($agent->status)->toBe('active')
        ->and($agent->revoked_at)->toBeNull();

    expect(Agent::where('server_id', $server->id)->count())->toBe(1);
    expect(Agent::where('server_id', $server->id)->where('status', 'active')->count())->toBe(1);
});
