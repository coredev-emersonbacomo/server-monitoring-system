<?php

use App\Enums\ServerStatus;
use App\Jobs\PingServerPorts;
use App\Models\Agent;
use App\Models\Client;
use App\Models\Port;
use App\Models\Server;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

function pingTestAgentAndServer(): array
{
    $client = Client::factory()->create();
    $agent = Agent::create([
        'server_id' => null,
        'version' => '2.1',
        'protocol_version' => '1',
        'status' => 'active',
        'installation_uuid' => str()->uuid()->toString(),
        'registered_at' => now(),
    ]);

    $server = Server::create([
        'client_id' => $client->id,
        'agent_id' => $agent->id,
        'name' => 'Ping Test Server',
        'host_name' => '127.0.0.1',
        'status' => ServerStatus::Online->value,
    ]);

    foreach ([[1, 'tcp', 'rpc'], [3306, 'tcp', 'mysql'], [5432, 'tcp', 'postgres']] as [$port, $proto, $proc]) {
        Port::create([
            'agent_id' => $agent->id,
            'protocol' => $proto,
            'port' => $port,
            'state' => 'listening',
            'process_name' => $proc,
        ]);
    }

    return [$agent, $server];
}

test('a null filter pings every TCP port the agent reports', function () {
    [$agent, $server] = pingTestAgentAndServer();

    $ports = PingServerPorts::pingablePorts($server, $agent);
    expect($ports->pluck('port')->all())->toContain(1, 3306, 5432);
});

test('the filter restricts pinging to exactly the checked ports', function () {
    [$agent, $server] = pingTestAgentAndServer();
    $server->update(['port_filter' => [3306]]);

    $ports = PingServerPorts::pingablePorts($server, $agent);
    expect($ports->pluck('port')->all())->toBe([3306]);
});

test('an empty filter means nothing is pinged', function () {
    [$agent, $server] = pingTestAgentAndServer();
    $server->update(['port_filter' => []]);

    expect(PingServerPorts::pingablePorts($server, $agent))->toBeEmpty();
});

test('the ping job only probes filtered-in ports and leaves the rest untouched', function () {
    Queue::fake();
    [$agent, $server] = pingTestAgentAndServer();
    $server->update(['port_filter' => [1]]);

    (new PingServerPorts($server))->handle();

    // Only the filtered-in port 1 may have been probed (gets a ping_status).
    $probed = Port::where('port', 1)->first();
    expect($probed->ping_status)->not->toBeNull();

    // Everything outside the filter is never touched.
    foreach ([3306, 5432] as $port) {
        expect(Port::where('port', $port)->first()->ping_status)->toBeNull();
    }
});
