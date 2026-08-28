<?php

use App\Jobs\MonitorServer;
use App\Models\Agent;
use App\Models\AgentLifecycleEvent;
use App\Models\Client;
use App\Models\FileActivityLog;
use App\Models\Server;
use App\Models\Setting;
use App\Models\User;
use App\Models\WatchedPath;
use App\Services\AgentAuthService;
use Database\Seeders\WatchedPathSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    Setting::create(['key' => 'offline_threshold', 'value' => '15']);
    Setting::create(['key' => 'heartbeat_interval', 'value' => '5']);

    $this->client = Client::create([
        'name' => 'Audit Client',
        'email' => 'audit@example.com',
        'location' => 'US',
        'alert_scope' => 'global',
    ]);

    $this->server = Server::create([
        'uuid' => Str::uuid7()->toString(),
        'client_id' => $this->client->id,
        'name' => 'audit-srv-01',
        'host_name' => 'audit-srv-01',
        'status' => 'online',
        'alert_scope' => 'global',
    ]);

    $this->agent = Agent::create([
        'server_id' => $this->server->id,
        'version' => '1.0.0',
        'protocol_version' => '1',
        'status' => 'active',
        'last_seen_at' => now(),
    ]);

    $this->server->update(['agent_id' => $this->agent->id]);
});

function agentToken(Agent $agent, Server $server): string
{
    return app(AgentAuthService::class)->issueToken($agent->id, $server->uuid);
}

function adminUser(): User
{
    return User::factory()->create([
        'username' => 'admin',
        'email' => 'admin@example.com',
    ]);
}

test('agent can ingest file activity events with ownership', function () {
    $token = agentToken($this->agent, $this->server);

    $response = $this->withHeader('Authorization', "Bearer $token")
        ->postJson('/api/v1/agent/audit/file-activity', [
            'events' => [[
                'uuid' => 'evt-1',
                'server_uuid' => $this->server->uuid,
                'action' => 'created',
                'file_name' => 'note.txt',
                'source_path' => 'C:\\ProgramData\\MonitorAgent\\note.txt',
                'is_directory' => false,
                'username' => 'SYSTEM',
                'process_name' => 'explorer.exe',
                'process_id' => 1234,
                'occurred_at' => now()->toIso8601String(),
            ]],
        ]);

    $response->assertOk()->assertJson(['inserted' => 1, 'skipped' => 0]);
    expect(FileActivityLog::count())->toBe(1);
    $row = FileActivityLog::first();
    expect($row->server_id)->toBe($this->server->id);
    expect($row->agent_id)->toBe($this->agent->id);
    expect($row->action)->toBe('created');
});

test('ingestion is idempotent by uuid on retry', function () {
    $token = agentToken($this->agent, $this->server);
    $payload = ['events' => [[
        'uuid' => 'evt-dup',
        'server_uuid' => $this->server->uuid,
        'action' => 'modified',
        'file_name' => 'a.txt',
        'source_path' => 'C:\\ProgramData\\MonitorAgent\\a.txt',
        'occurred_at' => now()->toIso8601String(),
    ]]];

    $this->withHeader('Authorization', "Bearer $token")->postJson('/api/v1/agent/audit/file-activity', $payload)
        ->assertOk()->assertJson(['inserted' => 1, 'skipped' => 0]);
    $this->withHeader('Authorization', "Bearer $token")->postJson('/api/v1/agent/audit/file-activity', $payload)
        ->assertOk()->assertJson(['inserted' => 0, 'skipped' => 1]);

    expect(FileActivityLog::count())->toBe(1);
});

test('event for a server the agent does not own is rejected (never attached)', function () {
    $token = agentToken($this->agent, $this->server);
    $otherServer = Server::create([
        'uuid' => Str::uuid7()->toString(),
        'client_id' => $this->client->id,
        'name' => 'other',
        'host_name' => 'other',
        'status' => 'online',
        'alert_scope' => 'global',
    ]);

    $this->withHeader('Authorization', "Bearer $token")
        ->postJson('/api/v1/agent/audit/file-activity', [
            'events' => [[
                'uuid' => 'evt-foreign',
                'server_uuid' => $otherServer->uuid,
                'action' => 'created',
                'file_name' => 'x.txt',
                'source_path' => 'C:\\x.txt',
                'occurred_at' => now()->toIso8601String(),
            ]],
        ])
        ->assertOk()->assertJson(['inserted' => 0, 'skipped' => 1]);

    expect(FileActivityLog::count())->toBe(0);
});

test('ingestion requires agent authentication', function () {
    $this->postJson('/api/v1/agent/audit/file-activity', ['events' => []])
        ->assertStatus(401);
});

test('agent can ingest lifecycle events', function () {
    $token = agentToken($this->agent, $this->server);

    $this->withHeader('Authorization', "Bearer $token")
        ->postJson('/api/v1/agent/audit/lifecycle', [
            'events' => [[
                'uuid' => 'life-1',
                'event_type' => 'started',
                'server_uuid' => $this->server->uuid,
                'occurred_at' => now()->toIso8601String(),
            ]],
        ])
        ->assertOk()->assertJson(['inserted' => 1, 'skipped' => 0]);

    expect(AgentLifecycleEvent::count())->toBe(1);
    expect(AgentLifecycleEvent::first()->event_type)->toBe('started');
});

test('jwt logs api filters file activity', function () {
    FileActivityLog::create([
        'uuid' => 'seed-1',
        'server_id' => $this->server->id,
        'agent_id' => $this->agent->id,
        'action' => 'deleted',
        'file_name' => 'secret.txt',
        'source_path' => 'C:\\ProgramData\\MonitorAgent\\secret.txt',
        'occurred_at' => now(),
    ]);

    $user = adminUser();

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/audit/file-activity?action=deleted')
        ->assertOk()
        ->assertJsonPath('data.0.action', 'deleted');

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/audit/file-activity?action=created')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/audit/file-activity?path=secret.txt')
        ->assertOk()
        ->assertJsonPath('data.0.file_name', 'secret.txt');
});

test('jwt logs api lists lifecycle events', function () {
    AgentLifecycleEvent::create([
        'uuid' => 'seed-life-1',
        'server_id' => $this->server->id,
        'agent_id' => $this->agent->id,
        'event_type' => 'stopped',
        'occurred_at' => now(),
    ]);

    $user = adminUser();

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/audit/agent-lifecycle?event_type=stopped')
        ->assertOk()
        ->assertJsonPath('data.0.event_type', 'stopped');
});

test('watched path default is seeded and admin can manage them', function () {
    $this->seed(WatchedPathSeeder::class);

    expect(WatchedPath::where('path', 'C:\\ProgramData\\MonitorAgent')->agent()->exists())->toBeTrue();

    $user = adminUser();

    $seededCount = WatchedPath::count();

    $this->actingAs($user, 'jwt')
        ->postJson('/api/v1/watched-paths', [
            'path' => 'C:\\Shared',
            'scope' => 'agent',
            'enabled' => true,
            'recursive' => true,
            'description' => 'Shared dir',
        ])
        ->assertCreated()
        ->assertJsonPath('path', 'C:\\Shared');

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/watched-paths')
        ->assertOk()
        ->assertJsonCount($seededCount + 1);

    $created = WatchedPath::where('path', 'C:\\Shared')->first();
    $this->actingAs($user, 'jwt')
        ->putJson("/api/v1/watched-paths/{$created->id}", ['enabled' => false])
        ->assertOk()
        ->assertJsonPath('enabled', false);

    $this->actingAs($user, 'jwt')
        ->deleteJson("/api/v1/watched-paths/{$created->id}")
        ->assertOk();

    expect(WatchedPath::where('path', 'C:\\Shared')->exists())->toBeFalse();
});

test('watched path server scope requires server_id', function () {
    $user = adminUser();

    $this->actingAs($user, 'jwt')
        ->postJson('/api/v1/watched-paths', [
            'path' => 'C:\\X',
            'scope' => 'server',
        ])
        ->assertStatus(422);
});

test('non-admin cannot manage watched paths', function () {
    $user = User::factory()->create([
        'username' => 'viewer',
        'email' => 'viewer@example.com',
    ]);

    $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/watched-paths')
        ->assertForbidden();
});

test('unexpected disconnect recorded only when no graceful stop', function () {
    // Agent stale -> server goes offline, no graceful event -> unexpected.
    $this->agent->update(['last_seen_at' => now()->subMinutes(30)]);

    MonitorServer::dispatchSync($this->server->uuid);

    expect(AgentLifecycleEvent::unexpected()->where('agent_id', $this->agent->id)->exists())->toBeTrue();

    // Now a graceful stop event within the grace window suppresses a second one.
    AgentLifecycleEvent::create([
        'server_id' => $this->server->id,
        'agent_id' => $this->agent->id,
        'event_type' => 'stopped',
        'occurred_at' => now(),
    ]);
    $before = AgentLifecycleEvent::unexpected()->where('agent_id', $this->agent->id)->count();

    $this->server->update(['status' => 'online', 'went_offline_at' => null]);
    $this->agent->update(['last_seen_at' => now()->subMinutes(30)]);
    MonitorServer::dispatchSync($this->server->uuid);

    expect(AgentLifecycleEvent::unexpected()->where('agent_id', $this->agent->id)->count())->toBe($before);
});
