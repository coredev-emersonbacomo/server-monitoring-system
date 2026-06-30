<?php

namespace App\Http\Controllers;

use App\Data\CreateServerData;
use App\Data\ServerData;
use App\Data\ServerSshData;
use App\Data\ServerUpdatesData;
use App\Data\StatPointData;
use App\Data\UpdateServerData;
use App\Events\ServerStatsUpdated;
use App\Models\Client;
use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Infrastructure\Api\ApiGenerator;
use Infrastructure\Service\InstallerService;

class ServerController extends Controller
{
    public function index(string $client)
    {
        $clientModel = Client::where('uuid', $client)->firstOrFail();
        $servers = Server::where('client_id', $clientModel->id)->get();
        return ServerData::collect($servers->map(fn(Server $s) => ServerData::fromModel($s)));
    }

    public function store(CreateServerData $data, string $client): ServerData
    {
        $clientModel = Client::where('uuid', $client)->firstOrFail();
        $clientId = $clientModel->id;

        try {
            $result = DB::transaction(function () use ($data, $clientId) {

                $server = Server::create([
                    'client_id'    => $clientId,
                    'server_name'  => $data->server_name,
                    'device_name'  => $data->device_name ?? $data->server_name,
                    'external_ip'  => $data->external_ip,
                    'ssh_port'     => $data->ssh_port,
                    'ssh_username' => Crypt::encryptString($data->ssh_username),
                    'ssh_password' => Crypt::encryptString($data->ssh_password),
                    'api_key'      => ApiGenerator::GenerateApiKey(),
                ]);

                $installer = new InstallerService(
                    sshHost: $server->external_ip,
                    sshPort: $server->ssh_port,
                    sshUser: $data->ssh_username,
                    sshPassword: $data->ssh_password,
                    serverId: $server->id,
                    apiToken: $server->api_key,
                );

                $installer->install();

                return $server;
            });

            return ServerData::fromModel($result);
        } catch (\RuntimeException $e) {
            abort(500, 'Installation failed: ' . $e->getMessage());
        }
    }

    public function show(string $client, string $server): ServerData
    {
        $serverModel = Server::where('uuid', $server)
            ->whereHas('client', fn($q) => $q->where('uuid', $client))
            ->firstOrFail();

        return ServerData::fromModel($serverModel);
    }

    public function update(UpdateServerData $data, string $client, string $server): ServerData
    {
        $serverModel = Server::where('uuid', $server)
            ->whereHas('client', fn($q) => $q->where('uuid', $client))
            ->firstOrFail();

        $updateData = $data->toArray();

        if ($data->device_name !== null) {
            $updateData['device_name'] = $data->device_name;
        }
        if ($data->external_ip !== null) {
            $updateData['external_ip'] = $data->external_ip;
        }
        if ($data->ssh_port !== null) {
            $updateData['ssh_port'] = $data->ssh_port;
        }
        if ($data->ssh_username !== null) {
            $updateData['ssh_username'] = Crypt::encryptString($data->ssh_username);
        }
        if ($data->ssh_password !== null) {
            $updateData['ssh_password'] = Crypt::encryptString($data->ssh_password);
        }

        $serverModel->update($updateData);

        return ServerData::fromModel($serverModel);
    }

    public function destroy(string $client, string $server): ServerData
    {
        $serverModel = Server::where('uuid', $server)
            ->whereHas('client', fn($q) => $q->where('uuid', $client))
            ->firstOrFail();

        $serverModel->delete();

        return ServerData::fromModel($serverModel);
    }

    public function listAll(Request $request): \Illuminate\Support\Collection
    {
        $onlineThreshold  = now()->subMinutes(5);
        $warningThreshold = now()->subMinutes(15);

        $query = DB::table('servers')
            ->leftJoinSub(
                DB::table('server_updates')
                    ->select('server_id', DB::raw('MAX(created_at) as last_seen'))
                    ->groupBy('server_id'),
                'lu',
                'servers.id', '=', 'lu.server_id'
            )
            ->join('clients', 'servers.client_id', '=', 'clients.id')
            ->select(
                'servers.uuid',
                'servers.server_name',
                'servers.device_name',
                'servers.external_ip',
                'servers.cpu_cores',
                'servers.ram',
                'servers.operating_system',
                'servers.client_id',
                'clients.uuid as client_uuid',
                'clients.name as client_name',
                'lu.last_seen',
            )
            ->selectRaw("
                CASE
                    WHEN lu.last_seen >= ? THEN 'online'
                    WHEN lu.last_seen < ? AND lu.last_seen >= ? THEN 'warning'
                    ELSE 'offline'
                END as status
            ", [$onlineThreshold, $onlineThreshold, $warningThreshold]);

        if ($clientUuid = $request->query('client_uuid')) {
            $client = Client::where('uuid', $clientUuid)->first();
            if ($client) {
                $query->where('servers.client_id', $client->id);
            }
        }

        return ServerData::collect($query->get());
    }

    public function showWithStats(string $uuid): ServerData
    {
        $server = DB::table('servers')->where('uuid', $uuid)->first();
        if (!$server) {
            abort(404, 'Server not found.');
        }

        $updates = DB::table('server_updates')
            ->where('server_id', $server->id)
            ->orderBy('created_at')
            ->limit(144)
            ->get();

        $stats = [];
        $prev = null;
        foreach ($updates as $row) {
            $stats[] = StatPointData::from(self::computeStatPoint($row, $prev));
            $prev = $row;
        }

        $client = DB::table('clients')
            ->where('id', $server->client_id)
            ->first();

        return ServerData::from([
                'uuid'             => $server->uuid,
                'server_name'      => $server->server_name,
                'device_name'      => $server->device_name,
                'external_ip'      => $server->external_ip,
                'cpu_cores'        => $server->cpu_cores ?? null,
                'ram'              => $server->ram ?? null,
                'operating_system' => $server->operating_system ?? null,
                'client_id'        => $server->client_id,
                'client_uuid'      => $client?->uuid ?? '',
                'client_name'      => $client?->name ?? 'Unknown',
                'stats'            => $stats,
            ]);
    }

    public function ingestStats(ServerUpdatesData $data): array
    {
        $serverInfo = DB::table('servers')
            ->where('id', $data->server_id)
            ->where('api_key', $data->token)
            ->first();

        if (!$serverInfo) {
            abort(401, 'Unauthorized or invalid server ID.');
        }

        $timestamp = $data->timestamp;

        DB::table('server_updates')->insert([
            'server_id'      => $data->server_id,
            'cpu_usage'      => $data->cpu_usage,
            'memory_usage'   => $data->memory_usage,
            'storage'        => $data->storage,
            'uptime'         => $data->uptime,
            'network_rbytes' => $data->network_rbytes,
            'network_tbytes' => $data->network_tbytes,
            'created_at'     => date('Y-m-d H:i:s', $timestamp),
            'updated_at'     => now(),
        ]);

        $rows = DB::table('server_updates')
            ->where('server_id', $data->server_id)
            ->orderByDesc('created_at')
            ->limit(2)
            ->get();

        $latest = $rows->first();
        $prev   = $rows->count() > 1 ? $rows->last() : null;

        $point = $latest ? self::computeStatPoint($latest, $prev) : [];

        $server = [
            'uuid'             => $serverInfo->uuid,
            'server_name'      => $serverInfo->server_name,
            'device_name'      => $serverInfo->device_name,
            'external_ip'      => $serverInfo->external_ip,
            'cpu_cores'        => $serverInfo->cpu_cores ?? null,
            'ram'              => $serverInfo->ram ?? null,
            'operating_system' => $serverInfo->operating_system ?? null,
        ];

        ServerStatsUpdated::dispatch($data->server_id, $point, $server);

        return ['success' => true, 'message' => 'Metrics recorded.'];
    }

    private static function computeStatPoint(object $row, ?object $prev): array
    {
        $ts = strtotime($row->created_at) * 1000;

        $netIn = 0;
        $netOut = 0;
        if ($prev) {
            $prevTs = strtotime($prev->created_at) * 1000;
            $dt = ($ts - $prevTs) / 1000;
            if ($dt > 0) {
                $netIn = (($row->network_rbytes - $prev->network_rbytes) / 1_000_000) / $dt;
                $netOut = (($row->network_tbytes - $prev->network_tbytes) / 1_000_000) / $dt;
            }
        }

        return [
            'timestamp' => $ts,
            'cpu'       => round((float) $row->cpu_usage, 1),
            'memory'    => round((float) $row->memory_usage, 1),
            'netIn'     => round($netIn, 2),
            'netOut'    => round($netOut, 2),
            'disk'      => round((float) $row->storage, 1),
        ];
    }

    public function uninstallServer(ServerSshData $data): array
    {
        $server = Server::where('uuid', $data->serverId)
            ->first(['id', 'ssh_password', 'ssh_username']);

        if (is_null($server)) {
            throw (new \Illuminate\Database\Eloquent\ModelNotFoundException)
                ->setModel(Server::class, [$data->serverId]);
        }

        try {
            $log = DB::transaction(function() use ($server, $data) {
                $installer = new InstallerService(
                    sshHost: $data->sshHost,
                    sshPort: $data->sshPort,
                    sshUser: Crypt::decryptString($server->ssh_username),
                    sshPassword: Crypt::decryptString($server->ssh_password),
                    serverId: (string) $server->id,
                    apiToken: $data->apiToken,
                );

                $log = $installer->uninstall();

                return $log;
            });

            return [
                'status' => true,
                'log'    => $log,
            ];
        } catch (\RuntimeException $e) {
            abort(500, 'Uninstall failed: ' . $e->getMessage());
        }
    }
}
