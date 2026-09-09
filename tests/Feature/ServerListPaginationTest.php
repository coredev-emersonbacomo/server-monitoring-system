<?php

use App\Models\Agent;
use App\Models\Client;
use App\Models\Server;
use App\Models\Setting;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(RefreshDatabase::class);

// HTTP tests send a real Bearer token (actingAs also works since the
// JwtGuard honors setUser, but tokens exercise the real middleware path).
function serversToken(User $user): string
{
    return app(JwtService::class)->generateAccessToken($user->id, (string) Str::uuid());
}

beforeEach(function () {
    Setting::set('offline_threshold', '15');
    Setting::set('heartbeat_interval', '5');

    $this->client = Client::create([
        'name' => 'Pagination Client',
        'email' => 'pagination@example.com',
        'location' => 'US',
        'alert_scope' => 'global',
    ]);

    $this->user = User::factory()->create([
        'username' => 'pager',
        'email' => 'pager@example.com',
    ]);
});

function makePagedServer(Client $client, string $name, string $stamp): Server
{
    return Server::create([
        'uuid' => Str::uuid7()->toString(),
        'client_id' => $client->id,
        'name' => $name,
        'host_name' => $name,
        'status' => 'pending_installation',
        'alert_scope' => 'global',
        'created_at' => $stamp,
        'updated_at' => $stamp,
    ]);
}

function fetchServerPage(TestCase $t, User $user, array $params): array
{
    return $t->withHeader('Authorization', 'Bearer '.serversToken($user))
        ->getJson('/api/v1/servers?'.http_build_query($params))
        ->assertOk()
        ->json();
}

test('all filter returns every server across pages when timestamps tie', function () {
    $stamp = '2026-09-01 00:00:00';

    // 120 pending servers sharing one timestamp + 1 online server on the same stamp.
    for ($i = 0; $i < 120; $i++) {
        makePagedServer($this->client, sprintf('tie-srv-%03d', $i), $stamp);
    }
    $online = makePagedServer($this->client, 'tie-srv-online', $stamp);
    $online->update(['status' => 'online']);
    $agent = Agent::create([
        'server_id' => $online->id,
        'version' => '1.0.0',
        'protocol_version' => '1',
        'status' => 'active',
        'registered_at' => now(),
        'last_seen_at' => now(),
    ]);
    $online->update(['agent_id' => $agent->id]);

    // Churn the heap the way production does (heartbeats/monitors rewrite
    // server rows between the frontend's page fetches). Indexed updates are
    // non-HOT, so tuples physically relocate; only a total ORDER BY survives.
    $churn = function (array $uuids) use ($agent) {
        $ids = Server::whereIn('uuid', array_slice($uuids, 0, 40))->pluck('id');
        Server::whereIn('id', $ids)->update(['agent_id' => $agent->id]);
        Server::whereIn('id', $ids)->update(['agent_id' => null]);
    };

    $params = ['status' => 'all', 'per_page' => 50, 'sort' => 'created_at', 'dir' => 'desc'];
    $first = fetchServerPage($this, $this->user, [...$params, 'page' => 1]);

    expect($first['total'])->toBe(121)
        ->and($first['last_page'])->toBe(3);

    $uuids = [];
    foreach ($first['data'] as $row) {
        $uuids[] = $row['uuid'];
    }
    $churn($uuids);
    for ($page = 2; $page <= $first['last_page']; $page++) {
        $payload = fetchServerPage($this, $this->user, [...$params, 'page' => $page]);
        foreach ($payload['data'] as $row) {
            $uuids[] = $row['uuid'];
        }
        $churn($uuids);
    }

    // No duplicates, nothing missing — the online server must be in the union.
    expect($uuids)->toHaveCount(121)
        ->and(array_unique($uuids))->toHaveCount(121)
        ->and($uuids)->toContain($online->uuid);
});

test('repeated page fetches return identical order on tied sort keys', function () {
    $stamp = '2026-09-01 00:00:00';
    for ($i = 0; $i < 10; $i++) {
        makePagedServer($this->client, sprintf('det-srv-%03d', $i), $stamp);
    }

    $params = ['status' => 'all', 'per_page' => 5, 'sort' => 'created_at', 'dir' => 'desc', 'page' => 2];
    $a = fetchServerPage($this, $this->user, $params);
    $b = fetchServerPage($this, $this->user, $params);

    expect(array_column($a['data'], 'uuid'))->toEqual(array_column($b['data'], 'uuid'));
});

test('search, sort and status filters stay consistent with pagination', function () {
    $stamp = '2026-09-01 00:00:00';
    for ($i = 0; $i < 30; $i++) {
        makePagedServer($this->client, sprintf('alpha-srv-%03d', $i), $stamp);
    }
    for ($i = 0; $i < 5; $i++) {
        makePagedServer($this->client, sprintf('beta-srv-%03d', $i), $stamp);
    }

    // Search narrows to the beta set on a single page.
    $search = fetchServerPage($this, $this->user, ['status' => 'all', 'q' => 'beta-srv', 'per_page' => 50]);
    expect($search['total'])->toBe(5)
        ->and($search['data'])->toHaveCount(5);

    // Name sort across pages covers the full set without overlap.
    $p1 = fetchServerPage($this, $this->user, ['status' => 'all', 'sort' => 'name', 'dir' => 'asc', 'per_page' => 20, 'page' => 1]);
    $p2 = fetchServerPage($this, $this->user, ['status' => 'all', 'sort' => 'name', 'dir' => 'asc', 'per_page' => 20, 'page' => 2]);
    $names = [...array_column($p1['data'], 'name'), ...array_column($p2['data'], 'name')];
    expect($p1['total'])->toBe(35)
        ->and($names)->toHaveCount(35)
        ->and(array_unique($names))->toHaveCount(35);

    $sorted = $names;
    sort($sorted);
    expect($names)->toEqual($sorted);

    // Pending-installation filter excludes the online server but keeps the rest.
    $pending = fetchServerPage($this, $this->user, ['status' => 'pending_installation', 'per_page' => 50]);
    expect($pending['total'])->toBe(35);
});
