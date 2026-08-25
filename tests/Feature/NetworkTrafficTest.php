<?php

namespace Tests\Feature;

use App\Enums\ServerStatus;
use App\Http\Controllers\Api\V1\ServerController;
use App\Models\Agent;
use App\Models\Client;
use App\Models\Server;
use App\Models\ServerUpdate;
use App\Models\Setting;
use App\Services\HeartbeatService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class NetworkTrafficTest extends TestCase
{
    use RefreshDatabase;

    private Client $client;

    private Server $server;

    private Agent $agent;

    protected function setUp(): void
    {
        parent::setUp();

        Setting::create(['key' => 'offline_threshold', 'value' => '15']);
        Setting::create(['key' => 'heartbeat_interval', 'value' => '5']);

        $this->client = Client::create([
            'name' => 'Net Traffic Client',
            'email' => 'net@example.com',
            'location' => 'US East',
            'alert_scope' => 'global',
        ]);

        $this->server = Server::create([
            'uuid' => Str::uuid7()->toString(),
            'client_id' => $this->client->id,
            'name' => 'net-node-01',
            'host_name' => 'net-node-01.internal',
            'status' => ServerStatus::Offline->value,
            'alert_scope' => 'global',
        ]);

        $this->agent = Agent::create([
            'server_id' => $this->server->id,
            'version' => '1.0.0',
            'protocol_version' => '1',
            'status' => 'online',
            'last_seen_at' => now()->subMinutes(30),
        ]);
    }

    private function payload(array $network): array
    {
        return [
            'timestamp' => now()->timestamp,
            'latency_ms' => 5,
            'cpu' => ['load1' => 12.5],
            'memory' => ['percent' => 40.0],
            'disk' => ['percent' => 55.0],
            'uptime' => 1000,
            'network' => $network,
        ];
    }

    public function test_heartbeat_persists_per_interface_rows_and_summed_totals(): void
    {
        Queue::fake();

        app(HeartbeatService::class)->process($this->agent, $this->server, $this->payload([
            ['interface' => 'Wi-Fi', 'type' => 'wifi', 'state' => 'up', 'rx_bytes' => 1000, 'tx_bytes' => 500],
            ['interface' => 'eth0', 'type' => 'ethernet', 'state' => 'down', 'rx_bytes' => 3000, 'tx_bytes' => 1500],
        ]));

        $rows = DB::table('server_network_stats')
            ->where('server_id', $this->server->id)
            ->get()
            ->keyBy('interface_name');

        $this->assertCount(2, $rows);
        $this->assertEquals('wifi', $rows['Wi-Fi']->interface_type);
        $this->assertEquals('up', $rows['Wi-Fi']->oper_state);
        $this->assertEquals(1000, $rows['Wi-Fi']->rx_bytes);
        $this->assertEquals('ethernet', $rows['eth0']->interface_type);
        $this->assertEquals('down', $rows['eth0']->oper_state);
        $this->assertEquals(3000, $rows['eth0']->rx_bytes);

        // server_updates keeps the cross-interface sum for dashboard compat.
        $update = ServerUpdate::where('server_id', $this->server->id)->sole();
        $this->assertEquals(4000, $update->network_rbytes);
        $this->assertEquals(2000, $update->network_tbytes);
    }

    public function test_legacy_payload_without_type_state_gets_unknown_defaults(): void
    {
        Queue::fake();

        app(HeartbeatService::class)->process($this->agent, $this->server, $this->payload([
            ['interface' => 'wlan0', 'rx_bytes' => 700, 'tx_bytes' => 300],
            ['interface' => '', 'rx_bytes' => 99, 'tx_bytes' => 99], // unnamed → skipped, still summed
        ]));

        $rows = DB::table('server_network_stats')->where('server_id', $this->server->id)->get();
        $this->assertCount(1, $rows);
        $this->assertEquals('wlan0', $rows[0]->interface_name);
        $this->assertEquals('unknown', $rows[0]->interface_type);
        $this->assertEquals('unknown', $rows[0]->oper_state);

        $update = ServerUpdate::where('server_id', $this->server->id)->sole();
        $this->assertEquals(799, $update->network_rbytes);
        $this->assertEquals(399, $update->network_tbytes);
    }

    public function test_compute_network_points_derives_mb_per_s_from_counter_deltas(): void
    {
        $rows = collect([
            (object) ['timestamp' => '2026-08-24 10:00:00', 'interfaceName' => 'wlan0', 'netIn' => 60_000_000, 'netOut' => 30_000_000],
            (object) ['timestamp' => '2026-08-24 10:00:00', 'interfaceName' => 'eth0', 'netIn' => 120_000_000, 'netOut' => 10_000_000],
            (object) ['timestamp' => '2026-08-24 10:01:00', 'interfaceName' => 'wlan0', 'netIn' => 96_000_000, 'netOut' => 30_000_000],
            (object) ['timestamp' => '2026-08-24 10:01:00', 'interfaceName' => 'eth0', 'netIn' => 90_000_000, 'netOut' => 40_000_000],
        ]);

        $points = ServerController::computeNetworkPoints($rows);

        $this->assertCount(2, $points);
        $byName1 = collect($points[0]['networks'])->keyBy('name');
        $byName2 = collect($points[1]['networks'])->keyBy('name');

        // First bucket: no predecessor → zero rates.
        $this->assertSame(0.0, $byName1['wlan0']['netIn']);
        $this->assertSame(0.0, $byName1['wlan0']['netOut']);

        // wlan0: +36MB in over 60s = 0.6 MB/s; unchanged out = 0.0.
        $this->assertSame(0.6, $byName2['wlan0']['netIn']);
        $this->assertSame(0.0, $byName2['wlan0']['netOut']);

        // eth0: counter reset (-30MB) clamps to 0; +30MB out over 60s = 0.5 MB/s.
        $this->assertSame(0.0, $byName2['eth0']['netIn']);
        $this->assertSame(0.5, $byName2['eth0']['netOut']);
    }

    public function test_get_network_points_reads_realtime_cagg_with_interface_rows(): void
    {
        Queue::fake();

        $t0 = now()->startOfMinute();
        foreach ([[1, 60_000_000, 30_000_000], [2, 96_000_000, 45_000_000]] as [$minute, $in, $out]) {
            DB::table('server_network_stats')->insert([
                'server_id' => $this->server->id,
                'interface_name' => 'wlan0',
                'interface_type' => 'wifi',
                'oper_state' => 'up',
                'rx_bytes' => $in,
                'tx_bytes' => $out,
                'created_at' => $t0->copy()->addMinutes($minute),
            ]);
        }

        $points = app(ServerController::class)->getNetworkPoints(
            $this->server->id,
            'server_updates_agg_minute',
            now()->subHour(),
        );

        $this->assertGreaterThanOrEqual(1, count($points));
        $last = end($points);
        $wlan = collect($last['networks'])->firstWhere('name', 'wlan0');
        $this->assertNotNull($wlan);
        $this->assertEqualsWithDelta(36 / 60, $wlan['netIn'], 0.01, '36MB delta over 60s bucket = 0.6 MB/s');
        $this->assertEqualsWithDelta(15 / 60, $wlan['netOut'], 0.01);
    }
}
