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

    $this->client = Client::create([
        'name' => 'Query Count Client',
        'email' => 'querycount@example.com',
        'location' => 'US',
        'alert_scope' => 'global',
    ]);

    $this->user = User::factory()->create([
        'username' => 'querycounter',
        'email' => 'querycounter@example.com',
    ]);
});

function queryCountToken(User $user): string
{
    return app(JwtService::class)->generateAccessToken($user->id, (string) Str::uuid());
}

test('servers list stays bounded in queries as rows grow', function () {
    for ($i = 0; $i < 30; $i++) {
        $server = Server::create([
            'uuid' => Str::uuid7()->toString(),
            'client_id' => $this->client->id,
            'name' => sprintf('qc-srv-%03d', $i),
            'host_name' => sprintf('qc-srv-%03d', $i),
            'status' => 'pending_installation',
            'alert_scope' => 'global',
        ]);

        // Every other server gets a live agent so the status path exercises
        // the agent branch too.
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

    $payload = $this->withHeader('Authorization', 'Bearer '.queryCountToken($this->user))
        ->getJson('/api/v1/servers?status=all&per_page=30')
        ->assertOk()
        ->json();

    $queryCount = count(DB::getQueryLog());
    DB::disableQueryLog();

    // Pre-fix this endpoint ran 6+ queries per row (180+ here, 600+ for 50
    // rows in production). The lean list mapper + eager loads keep it flat,
    // with 9 indexed COUNTs for the badge counts riding along.
    expect($queryCount)->toBeLessThan(30)
        ->and($payload['total'])->toBe(30)
        ->and($payload['data'])->toHaveCount(30)
        ->and($payload['counts']['all'])->toBe(30)
        ->and($payload['counts']['pending_installation'])->toBe(15)
        ->and($payload['counts']['online'])->toBe(15)
        ->and($payload['counts']['archived'])->toBe(0);
});

test('servers list rows carry card fields only', function () {
    $server = Server::create([
        'uuid' => Str::uuid7()->toString(),
        'client_id' => $this->client->id,
        'name' => 'qc-card',
        'host_name' => 'qc-card',
        'description' => 'card description',
        'status' => 'pending_installation',
        'alert_scope' => 'global',
    ]);

    $row = $this->withHeader('Authorization', 'Bearer '.queryCountToken($this->user))
        ->getJson('/api/v1/servers?status=all&per_page=15')
        ->assertOk()
        ->json('data.0');

    expect($row['uuid'])->toBe($server->uuid)
        ->and($row['name'])->toBe('qc-card')
        ->and($row)->toHaveKeys(['client_uuid', 'client_name', 'description', 'host_name', 'status', 'record_status', 'agent_deleted', 'is_assigned_to_current_user', 'operating_system', 'cpu_cores', 'ram'])
        // Detail-only payloads must not ride along on the list endpoint.
        ->and($row)->not->toHaveKeys(['ports', 'processes', 'activities', 'agent', 'stats']);
});
