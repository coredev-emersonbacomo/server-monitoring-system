<?php

namespace Tests\Feature;

use App\Models\Agent;
use App\Models\Client;
use App\Models\CustomActivityLog;
use App\Models\FileActivityLog;
use App\Models\Heartbeat;
use App\Models\MetricBatch;
use App\Models\MetricSample;
use App\Models\Server;
use App\Models\Setting;
use App\Models\User;
use App\Services\AgentDataCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class)->group('agent-data-cleanup');

beforeEach(function () {
    $this->client = Client::factory()->create();
    $this->server = Server::factory()->create([
        'client_id' => $this->client->id,
    ]);
    $this->agent = Agent::create([
        'server_id' => $this->server->id,
        'version' => '1.0.0',
        'protocol_version' => '1',
        'status' => 'online',
        'last_seen_at' => now(),
    ]);
});

test('cleanup deletes old heartbeats but keeps fresh ones', function () {
    $old = Heartbeat::create([
        'agent_id' => $this->agent->id,
        'status' => 'success',
        'received_at' => now()->subDays(90),
    ]);
    $fresh = Heartbeat::create([
        'agent_id' => $this->agent->id,
        'status' => 'success',
        'received_at' => now(),
    ]);

    $service = app(AgentDataCleanupService::class);
    $counts = $service->cleanup();

    $this->assertDatabaseMissing('heartbeats', ['id' => $old->id]);
    $this->assertDatabaseHas('heartbeats', ['id' => $fresh->id]);
    expect($counts['heartbeats'])->toBe(1);
});

test('cleanup deletes old metric batches and samples but keeps new ones', function () {
    $oldHeartbeat = Heartbeat::create([
        'agent_id' => $this->agent->id,
        'status' => 'success',
        'received_at' => now()->subDays(90),
    ]);
    $oldBatch = MetricBatch::create([
        'heartbeat_id' => $oldHeartbeat->id,
        'agent_id' => $this->agent->id,
        'created_at' => now()->subDays(90),
    ]);
    $oldSample = MetricSample::create([
        'batch_id' => $oldBatch->id,
        'metric_type' => 'cpu',
        'metric_name' => 'load1',
        'value' => 1.5,
        'recorded_at' => now()->subDays(90),
    ]);

    $freshHeartbeat = Heartbeat::create([
        'agent_id' => $this->agent->id,
        'status' => 'success',
        'received_at' => now(),
    ]);
    $freshBatch = MetricBatch::create([
        'heartbeat_id' => $freshHeartbeat->id,
        'agent_id' => $this->agent->id,
        'created_at' => now(),
    ]);

    $service = app(AgentDataCleanupService::class);
    $counts = $service->cleanup();

    $this->assertDatabaseMissing('metric_batches', ['id' => $oldBatch->id]);
    $this->assertDatabaseMissing('metric_samples', ['id' => $oldSample->id]);
    $this->assertDatabaseHas('metric_batches', ['id' => $freshBatch->id]);
    expect($counts['metric_batches'])->toBe(1);
});

test('cleanup deletes old file activity logs but keeps fresh ones', function () {
    $old = FileActivityLog::create([
        'agent_id' => $this->agent->id,
        'server_id' => $this->server->id,
        'action' => 'modified',
        'file_name' => 'app.php',
        'source_path' => '/srv/app.php',
        'occurred_at' => now()->subDays(90),
    ]);
    $fresh = FileActivityLog::create([
        'agent_id' => $this->agent->id,
        'server_id' => $this->server->id,
        'action' => 'created',
        'file_name' => 'new.php',
        'source_path' => '/srv/new.php',
        'occurred_at' => now(),
    ]);

    $service = app(AgentDataCleanupService::class);
    $counts = $service->cleanup();

    $this->assertDatabaseMissing('file_activity_logs', ['uuid' => $old->uuid]);
    $this->assertDatabaseHas('file_activity_logs', ['uuid' => $fresh->uuid]);
    expect($counts['file_activity'])->toBe(1);
});

test('cleanup does not delete agent log entries', function () {
    // CustomActivityLog uses $fillable (no created_at), so set the timestamp on
    // the instance before save so Eloquent doesn't overwrite it with now().
    $oldLog = new CustomActivityLog([
        'type' => 'agent',
        'logable_type' => 'server',
        'logable_id' => (string) $this->server->id,
        'action' => 'agent_updated',
    ]);
    $oldLog->created_at = now()->subDays(90);
    $oldLog->save();

    $service = app(AgentDataCleanupService::class);
    $service->cleanup();

    // Log entries are intentionally kept — only high-volume data is purged.
    $this->assertDatabaseHas('activity_logs', ['id' => $oldLog->id]);
    expect(isset($service->cleanup()['agent_logs']))->toBeFalse();
});

test('cleanup respects the configured retention days', function () {
    Setting::set('agent_log_retention_days', '30');

    $old = Heartbeat::create([
        'agent_id' => $this->agent->id,
        'status' => 'success',
        'received_at' => now()->subDays(45),
    ]);

    $service = app(AgentDataCleanupService::class);
    $service->cleanup();

    $this->assertDatabaseMissing('heartbeats', ['id' => $old->id]);
});

test('cleanup defaults to 60 days when no retention setting exists', function () {
    Heartbeat::create([
        'agent_id' => $this->agent->id,
        'status' => 'success',
        'received_at' => now()->subDays(45),
    ]);

    expect(AgentDataCleanupService::retentionDays())->toBe(60);

    $service = app(AgentDataCleanupService::class);
    $service->cleanup();

    expect(Heartbeat::where('agent_id', $this->agent->id)->count())->toBe(1);
});

test('settings endpoint accepts agent_log_retention_days', function () {
    $admin = User::factory()->create([
        'email' => 'admin@example.com',
        'password' => bcrypt('password123'),
    ]);

    $login = $this->postJson('/api/login', [
        'email' => 'admin@example.com',
        'password' => 'password123',
    ]);
    $token = $login->json('access_token');

    $response = $this->withHeaders([
        'Authorization' => 'Bearer '.$token,
    ])->putJson('/api/settings', [
        'agent_log_retention_days' => 120,
    ]);

    $response->assertStatus(200)
        ->assertJson(['agent_log_retention_days' => '120']);

    expect(Setting::get('agent_log_retention_days'))->toBe('120');
});
