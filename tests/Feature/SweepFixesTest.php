<?php

use App\Models\Agent;
use App\Models\Client;
use App\Models\Server;
use App\Models\Setting;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    Setting::set('offline_threshold', '15');

    $this->client = Client::factory()->create(['name' => 'Sweep Client']);

    $this->user = User::factory()->create([
        'username' => 'sweeper',
        'email' => 'sweeper@example.com',
    ]);
});

function sweepToken(User $user): string
{
    return app(JwtService::class)->generateAccessToken($user->id, (string) Str::uuid());
}

function sweepAuth(object $t, User $user): object
{
    return $t->withHeader('Authorization', 'Bearer '.sweepToken($user));
}

test('server report endpoint renders metrics', function () {
    $server = Server::create([
        'uuid' => Str::uuid7()->toString(),
        'client_id' => $this->client->id,
        'name' => 'sweep-report',
        'host_name' => 'sweep-report',
        'status' => 'pending_installation',
        'alert_scope' => 'global',
    ]);

    $payload = sweepAuth($this, $this->user)
        ->getJson("/api/v1/servers/{$server->uuid}/report")
        ->assertOk()
        ->json();

    expect($payload['uuid'])->toBe($server->uuid)
        ->and($payload)->toHaveKeys(['metrics', 'uptime', 'activities']);
});

test('removed cost-logs route is gone', function () {
    $server = Server::create([
        'uuid' => Str::uuid7()->toString(),
        'client_id' => $this->client->id,
        'name' => 'sweep-nocost',
        'host_name' => 'sweep-nocost',
        'status' => 'pending_installation',
        'alert_scope' => 'global',
    ]);

    sweepAuth($this, $this->user)
        ->getJson("/api/v1/clients/{$this->client->uuid}/servers/{$server->uuid}/cost-logs")
        ->assertNotFound();
});

test('client servers list stays bounded and lean', function () {
    for ($i = 0; $i < 10; $i++) {
        $server = Server::create([
            'uuid' => Str::uuid7()->toString(),
            'client_id' => $this->client->id,
            'name' => sprintf('sweep-cli-%03d', $i),
            'host_name' => sprintf('sweep-cli-%03d', $i),
            'status' => 'pending_installation',
            'alert_scope' => 'global',
            'subscription_fee' => 10.00,
        ]);

        if ($i % 2 === 0) {
            $agent = Agent::create([
                'server_id' => $server->id,
                'version' => '1.0.0',
                'protocol_version' => '1',
                'status' => 'active',
                'registered_at' => now(),
                'last_seen_at' => now(),
            ]);
            $server->update(['agent_id' => $agent->id, 'status' => 'online']);
        }
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    $rows = sweepAuth($this, $this->user)
        ->getJson("/api/v1/clients/{$this->client->uuid}/servers")
        ->assertOk()
        ->json();

    $queryCount = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($queryCount)->toBeLessThan(20)
        ->and($rows)->toHaveCount(10)
        ->and($rows[0])->toHaveKeys(['uuid', 'name', 'subscription_fee', 'has_registered_agent'])
        ->and($rows[0])->not->toHaveKeys(['ports', 'processes', 'activities', 'agent']);
});

test('client report stays bounded', function () {
    for ($i = 0; $i < 6; $i++) {
        $server = Server::create([
            'uuid' => Str::uuid7()->toString(),
            'client_id' => $this->client->id,
            'name' => sprintf('sweep-rep-%03d', $i),
            'host_name' => sprintf('sweep-rep-%03d', $i),
            'status' => 'pending_installation',
            'alert_scope' => 'global',
        ]);

        if ($i % 2 === 0) {
            $agent = Agent::create([
                'server_id' => $server->id,
                'version' => '1.0.0',
                'protocol_version' => '1',
                'status' => 'active',
                'registered_at' => now(),
                'last_seen_at' => now(),
            ]);
            $server->update(['agent_id' => $agent->id, 'status' => 'online']);
        }
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    $payload = sweepAuth($this, $this->user)
        ->getJson("/api/v1/reports/client/{$this->client->uuid}")
        ->assertOk()
        ->json();

    $queryCount = count(DB::getQueryLog());
    DB::disableQueryLog();

    // Pre-fix: agent + latestUpdate + 24h updates lazy per server.
    expect($queryCount)->toBeLessThan(15)
        ->and($payload['total_servers'])->toBe(6)
        ->and($payload['servers'])->toHaveCount(6);
});

test('user clients list stays bounded', function () {
    for ($i = 0; $i < 8; $i++) {
        $client = Client::factory()->create(['name' => "sweep-ucli-{$i}"]);
        $this->user->clients()->attach($client->id, [
            'uuid' => Str::uuid()->toString(),
            'record_status' => 'active',
        ]);
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    $rows = sweepAuth($this, $this->user)
        ->getJson("/api/users/{$this->user->uuid}/clients")
        ->assertOk()
        ->json();

    $queryCount = count(DB::getQueryLog());
    DB::disableQueryLog();

    // Pre-fix: 2 queries per client (secopclients exists + count). Now flat.
    expect($queryCount)->toBeLessThan(15)
        ->and($rows)->toHaveCount(8)
        ->and($rows[0])->toHaveKeys(['uuid', 'name', 'secops_count', 'is_assigned_to_current_user'])
        ->and($rows[0]['is_assigned_to_current_user'])->toBeTrue();
});
