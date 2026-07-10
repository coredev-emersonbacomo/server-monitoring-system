<?php

use App\Models\User;
use App\Models\Client;
use App\Models\Server;
use App\Models\ProvisionToken;
use App\Models\Agent;
use App\Models\AgentIdentity;
use App\Enums\ServerStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('end-to-end agent provisioning, registration, and heartbeat flow', function () {
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
            'heartbeat_interval',
            'api_url',
            'register_url',
        ]);

    // 4. Act: Agent registration
    $registerResponse = $this->postJson('/api/v1/register', [
        'token' => $token,
        'agent_version' => '1.0',
        'capabilities' => ['metrics.cpu', 'metrics.memory'],
        'hostname' => 'webapp-prod',
        'operating_system' => 'Ubuntu 24.04',
        'architecture' => 'x86_64',
    ]);

    $registerResponse->assertStatus(200)
        ->assertJsonStructure([
            'identity',
            'configuration',
            'heartbeat_interval',
        ]);

    $identityToken = $registerResponse->json('identity');
    expect($server->fresh()->status)->toBe(ServerStatus::WaitingForFirstHeartbeat->value);

    // 5. Act: Agent heartbeat (First Heartbeat transitions to Online)
    $heartbeatResponse = $this->withHeaders([
        'Authorization' => 'Bearer ' . $identityToken,
    ])->postJson('/api/v1/agent/heartbeat', [
        'agent_version' => '1.0',
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
        'services' => [
            ['name' => 'sshd', 'state' => 'running'],
        ],
        'open_db_ports' => [
            ['port' => 3306, 'protocol' => 'tcp', 'process' => 'mysqld'],
        ],
    ]);

    $heartbeatResponse->assertStatus(200)
        ->assertJsonStructure([
            'heartbeat_interval',
            'current_time',
            'pending_commands',
        ]);

    expect($server->fresh()->status)->toBe(ServerStatus::Online->value);
});
