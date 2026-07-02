<?php

namespace App\Http\Controllers;

use App\Data\CreateServerData;
use App\Data\ServerData;
use App\Data\ServerUpdatesData;
use App\Data\StatPointData;
use App\Data\UpdateServerData;
use App\Data\UpdateServerSpecsData;
use App\Events\ServerStatsUpdated;
use App\Models\Client;
use App\Models\Server;
use App\Models\ServerUpdate;
use Illuminate\Http\JsonResponse;
use Dedoc\Scramble\Attributes\QueryParameter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Infrastructure\Api\ApiGenerator;
use Infrastructure\Service\InstallerService;

class ServerController extends Controller
{
    public function index(string $clientUuid)
    {
        $clientModel = Client::where('uuid', $clientUuid)->firstOrFail();
        $servers = Server::where('client_id', $clientModel->id)->get();
        return ServerData::collect($servers->map(fn(Server $s) => ServerData::fromModel($s)));
    }

    public function store(CreateServerData $data, string $clientUuid): ServerData
    {
        $clientModel = Client::where('uuid', $clientUuid)->firstOrFail();
        $clientId = $clientModel->id;

        try {
            $result = DB::transaction(function () use ($data, $clientId) {

                $server = Server::create([
                    'client_id'    => $clientId,
                    'server_name'  => $data->server_name,
                    'host_name'  => $data->host_name ?? $data->server_name,
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
                    serverUUID: $server->uuid,
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

    public function show(string $clientUuid, string $serverUuid): ServerData
    {
        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        return ServerData::fromModel($serverModel);
    }

    public function update(UpdateServerData $data, string $clientUuid, string $serverUuid): ServerData
    {
        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $updateData = $data->toArray();

        if ($data->host_name !== null) {
            $updateData['host_name'] = $data->host_name;
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

    public function destroy(string $clientUuid, string $serverUuid)
    {
        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $serverModel->delete();

        return response()->json(['status' => 'success']);
    }

    #[QueryParameter('client_uuid', type: 'string', description: 'Filter servers by client UUID')]
    public function listAll(Request $request)
    {
        $onlineThreshold  = now()->subMinutes(5);
        $warningThreshold = now()->subMinutes(15);

        $query = Server::with('client', 'latestUpdate');

        if ($clientUuid = $request->query('client_uuid')) {
            $client = Client::where('uuid', $clientUuid)->first();
            if ($client) {
                $query->where('client_id', $client->id);
            }
        }

        $servers = $query->orderBy('created_at', 'desc')->get();

        return ServerData::collect($servers->map(function (Server $server) use ($onlineThreshold, $warningThreshold) {
            $lastSeen = $server->latestUpdate?->created_at;
            $health = Server::computeHealth($lastSeen, $onlineThreshold, $warningThreshold);

            return ServerData::from([
                'uuid'             => $server->uuid,
                'server_name'      => $server->server_name,
                'host_name'        => $server->host_name,
                'external_ip'      => $server->external_ip,
                'client_uuid'      => $server->client->uuid,
                'client_name'      => $server->client->name,
                'created_at'       => $server->created_at->toIso8601String(),
                'updated_at'       => $server->updated_at->toIso8601String(),
                'cpu_cores'        => $server->cpu_cores,
                'ram'              => $server->ram,
                'operating_system' => $server->operating_system,
                'record_status'    => $server->record_status->value,
                'status'           => $health->value,
            ]);
        }));
    }

    public function showWithStats(string $serverUuid): ServerData
    {
        $server = Server::where('uuid', $serverUuid)->first();
        if (!$server) {
            abort(404, 'Server not found.');
        }

        $updates = $server->updates()
            ->orderBy('created_at')
            ->limit(144)
            ->get();

        $stats = [];
        $prev = null;
        foreach ($updates as $row) {
            $stats[] = StatPointData::from(self::computeStatPoint($row, $prev));
            $prev = $row;
        }

        $client = $server->client;

        return ServerData::from([
            'uuid'             => $server->uuid,
            'server_name'      => $server->server_name,
            'host_name'        => $server->host_name,
            'external_ip'      => $server->external_ip,
            'ssh_port'         => $server->ssh_port,
            'ssh_username'     => $server->ssh_username,
            'created_at'       => $server->created_at->toIso8601String(),
            'updated_at'       => $server->updated_at->toIso8601String(),
            'cpu_cores'        => $server->cpu_cores ?? null,
            'ram'              => $server->ram ?? null,
            'operating_system' => $server->operating_system ?? null,
            'client_id'        => $server->client_id,
            'client_uuid'      => $client?->uuid ?? '',
            'client_name'      => $client?->name ?? 'Unknown',
            'record_status'    => $server->record_status->value,
            'stats'            => $stats,
        ]);
    }

    public function ingestStats(ServerUpdatesData $data): array
    {
        $server = Server::where('uuid', $data->uuid)
            ->where('api_key', $data->token)
            ->first();

        abort_if(!$server, 401, 'Unauthorized or invalid server ID.');

        $server->updates()->create([
            'cpu_usage'      => $data->cpu_usage,
            'memory_usage'   => $data->memory_usage,
            'disk_usage'     => $data->disk_usage,
            'uptime'         => $data->uptime,
            'network_rbytes' => $data->network_rxbytes,
            'network_tbytes' => $data->network_txbytes,
            'created_at'     => date('Y-m-d H:i:s', $data->timestamp),
        ]);

        $rows = $server->updates()
            ->orderByDesc('created_at')
            ->limit(2)
            ->get();

        $latest = $rows->first();
        $prev   = $rows->count() > 1 ? $rows->last() : null;

        $stats = $latest ? self::computeStatPoint($latest, $prev) : [];

        $broadcast = $stats ? [
            't' => $stats['timestamp'],
            'c' => $stats['cpu'],
            'm' => $stats['memory'],
            'i' => $stats['netIn'],
            'o' => $stats['netOut'],
            'd' => $stats['disk'],
        ] : [];

        ServerStatsUpdated::dispatchSync($server->uuid, $broadcast);

        return ['success' => true, 'message' => 'Metrics recorded.'];
    }

    private static function computeStatPoint(ServerUpdate $row, ?ServerUpdate $prev): array
    {
        $ts = $row->created_at->getPreciseTimestamp(3);

        $netIn = 0;
        $netOut = 0;
        if ($prev) {
            $prevTs = $prev->created_at->getPreciseTimestamp(3);
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

    public function uninstallServer(Request $request): array
    {
        $validated = $request->validate([
            'uuid' => ['required', 'uuid'],
        ]);

        $server = Server::where('uuid', $validated['uuid'])
            ->firstOrFail([
                'external_ip',
                'port',
                'ssh_username',
                'ssh_password',
                'api_key'
            ]);

        try {
            $log = DB::transaction(function () use ($server) {
                $installer = new InstallerService(
                    sshHost: $server->sshHost,
                    sshPort: $server->sshPort,
                    sshUser: Crypt::decryptString($server->ssh_username),
                    sshPassword: Crypt::decryptString($server->ssh_password),
                    serverUUID: (string) $server->uuid,
                    apiToken: $server->apiToken,
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

    public function updateServerSpecs(UpdateServerSpecsData $data): JsonResponse
    {
        $updated = Server::where('uuid', $data->uuid)
            ->where('api_key', $data->token)
            ->update([
                'cpu_model'        => $data->cpu_model,
                'cpu_cores'        => $data->cpu_cores,
                'ram'              => $data->ram,
                'operating_system' => $data->operating_system,
            ]);

        if ($updated === 0) {
            return response()->json(['status'  => 'error',], 404);
        }

        return response()->json(['status' => 'success'], 200);
    }
}
