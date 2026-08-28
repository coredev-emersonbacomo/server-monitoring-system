<?php

use App\Models\Agent;
use App\Models\AgentLifecycleEvent;
use App\Models\Client;
use App\Models\FileActivityLog;
use App\Models\Server;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
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

function auditAdminUser(): User
{
    return once(fn () => User::factory()->create([
        'username' => 'admin',
        'email' => 'admin@example.com',
    ]));
}

function seedFileActivity(Server $server, Agent $agent, int $count): void
{
    $base = now()->subMinutes($count);
    for ($i = 0; $i < $count; $i++) {
        FileActivityLog::create([
            'uuid' => "f-{$i}",
            'server_id' => $server->id,
            'agent_id' => $agent->id,
            'action' => 'created',
            'file_name' => "f{$i}.txt",
            'source_path' => "C:\\f{$i}.txt",
            'occurred_at' => $base->copy()->addMinutes($i),
        ]);
    }
}

test('file activity defaults to cursor pagination with a next token', function () {
    seedFileActivity($this->server, $this->agent, 12);

    $this->actingAs(auditAdminUser(), 'jwt')
        ->getJson('/api/v1/audit/file-activity?per_page=5')
        ->assertOk()
        ->assertJsonPath('meta.pagination.mode', 'cursor')
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.pagination.has_next', true)
        ->assertJsonPath('meta.pagination.has_previous', false)
        ->assertJsonPath('meta.pagination.next_cursor', fn ($v) => is_string($v) && strlen($v) > 0);
});

test('cursor advances without overlapping rows', function () {
    seedFileActivity($this->server, $this->agent, 12);

    $first = $this->actingAs(auditAdminUser(), 'jwt')
        ->getJson('/api/v1/audit/file-activity?per_page=5')
        ->assertOk();
    $first->assertJsonPath('data.0.file_name', 'f11.txt');

    $cursor = $first->json('meta.pagination.next_cursor');

    $second = $this->actingAs(auditAdminUser(), 'jwt')
        ->getJson("/api/v1/audit/file-activity?per_page=5&cursor={$cursor}")
        ->assertOk();
    $second->assertJsonPath('meta.pagination.has_previous', true);
    $second->assertJsonPath('meta.pagination.has_next', true);
    $second->assertJsonPath('data.0.file_name', 'f6.txt');
});

test('explicit page switches to offset pagination with totals', function () {
    seedFileActivity($this->server, $this->agent, 12);

    $this->actingAs(auditAdminUser(), 'jwt')
        ->getJson('/api/v1/audit/file-activity?page=2&per_page=5')
        ->assertOk()
        ->assertJsonPath('meta.pagination.mode', 'page')
        ->assertJsonPath('meta.pagination.current_page', 2)
        ->assertJsonPath('meta.pagination.total', 12)
        ->assertJsonPath('meta.pagination.last_page', 3)
        ->assertJsonCount(5, 'data');
});

test('previous cursor returns the page before without skipping rows', function () {
    seedFileActivity($this->server, $this->agent, 12);

    $first = $this->actingAs(auditAdminUser(), 'jwt')
        ->getJson('/api/v1/audit/file-activity?per_page=5')
        ->assertOk();
    $first->assertJsonPath('data.0.file_name', 'f11.txt');

    $second = $this->actingAs(auditAdminUser(), 'jwt')
        ->getJson('/api/v1/audit/file-activity?per_page=5&cursor='.$first->json('meta.pagination.next_cursor'))
        ->assertOk();
    $second->assertJsonPath('data.0.file_name', 'f6.txt');

    // Going back must land on page 1 (f11..f7), not skip any row.
    $this->actingAs(auditAdminUser(), 'jwt')
        ->getJson('/api/v1/audit/file-activity?per_page=5&previous_cursor='.$second->json('meta.pagination.previous_cursor'))
        ->assertOk()
        ->assertJsonPath('data.0.file_name', 'f11.txt');
});

test('agent lifecycle also supports cursor pagination', function () {
    $base = now()->subMinutes(8);
    for ($i = 0; $i < 8; $i++) {
        AgentLifecycleEvent::create([
            'uuid' => "l-{$i}",
            'server_id' => $this->server->id,
            'agent_id' => $this->agent->id,
            'event_type' => 'started',
            'occurred_at' => $base->copy()->addMinutes($i),
        ]);
    }

    $this->actingAs(auditAdminUser(), 'jwt')
        ->getJson('/api/v1/audit/agent-lifecycle?per_page=5')
        ->assertOk()
        ->assertJsonPath('meta.pagination.mode', 'cursor')
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.pagination.has_next', true);
});
