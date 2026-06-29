<?php

namespace App\Http\Controllers;

use App\Data\CreateServerData;
use App\Data\ServerData;
use App\Data\ServerSshData;
use App\Data\UpdateServerData;
use App\Models\Client;
use App\Models\Server;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Crypt;
use Infrastructure\Api\ApiGenerator;
use Infrastructure\Service\InstallerService;

class ServerController extends Controller
{
    public function index(int $client_id)
    {
        $servers = Server::where('client_id', $client_id)->get()->map(fn($s) => [
            'id' => $s->id,
            'client_id' => $s->client_id,
            'server_name' => $s->server_name,
            'device_name' => $s->device_name,
            'internal_ip' => $s->internal_ip,
            'external_ip' => $s->external_ip,
            'port' => $s->port,
            'ssh_username' => $s->ssh_username,
            'cpu_cores' => $s->cpu_cores,
            'ram' => $s->ram,
            'operating_system' => $s->operating_system,
            'created_at' => $s->created_at?->toIso8601String() ?? '',
            'updated_at' => $s->updated_at?->toIso8601String() ?? '',
        ]);

        return ServerData::collect($servers);
    }

    public function store(CreateServerData $data, int $client_id): JsonResponse
    {
        if (!Client::where('id', $client_id)->exists()) {
            abort(400, 'Client not found.');
        }

        $server = Server::create([
            'client_id' => $client_id,
            'server_name' => $data->server_name,
            'device_name' => $data->device_name ?? $data->server_name,
            'internal_ip' => $data->internal_ip,
            'external_ip' => $data->external_ip ?? $data->internal_ip,
            'port' => $data->port,
            'ssh_username' => $data->ssh_username,
            'ssh_password' => $data->ssh_password ? Crypt::encryptString($data->ssh_password) : null,
            'api_key' => ApiGenerator::GenerateApiKey(),
        ]);

        try {
            $installer = new InstallerService(
                sshHost:     $server->external_ip,
                sshPort:     $server->sshPort,
                sshUser:     $server->sshUser,
                sshPassword: $server->sshPassword,
                serverId:    $server->serverId,
                apiToken:    $server->apiToken
            );

            $log = $installer->install();

        } catch (\RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }

        // Return the logs for installation
        return response()->json([
            'success' => true,
            'log' => $log,
            'data' => $server,
        ], 201);
    }

    public function show(int $client_id, int $id): ServerData
    {
        $server = Server::where('client_id', $client_id)
            ->where('id', $id)
            ->firstOrFail();

        return ServerData::from($server->toArray());
    }

    public function update(UpdateServerData $data, int $client_id, int $id): ServerData
    {
        $server = Server::where('client_id', $client_id)
            ->where('id', $id)
            ->firstOrFail();

        $updateData = $data->toArray();

        if ($data->device_name !== null) {
            $updateData['device_name'] = $data->device_name;
        }
        if ($data->external_ip !== null) {
            $updateData['external_ip'] = $data->external_ip;
        }
        if ($data->port !== null) {
            $updateData['port'] = $data->port;
        }
        if ($data->ssh_username !== null) {
            $updateData['ssh_username'] = $data->ssh_username;
        }
        if ($data->ssh_password !== null) {
            $updateData['ssh_password'] = Crypt::encryptString($data->ssh_password);
        }

        $server->update($updateData);

        return ServerData::from($server->toArray());
    }

    public function destroy(int $client_id, int $id): ServerData
    {
        $server = Server::where('client_id', $client_id)
            ->where('id', $id)
            ->firstOrFail();

        $server->delete();

        return ServerData::from($server->toArray());
    }

    public function installServer(ServerSshData $data): JsonResponse
    {
        try {
            $installer = new InstallerService(
                sshHost: $data->sshHost,
                sshPort: $data->sshPort,
                sshUser: $data->sshUser,
                sshPassword: $data->sshPassword,
                serverId: $data->serverId,
                apiToken: $data->apiToken,
            );

            $log = $installer->install();

            return response()->json([
                'status' => 'success',
                'log'    => $log,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function uninstallServer(ServerSshData $data): JsonResponse
    {
        try {
            $installer = new InstallerService(
                sshHost:     $data->sshHost,
                sshPort:     $data->sshPort,
                sshUser:     $data->sshUser,
                sshPassword: $data->sshPassword,
                serverId:    $data->serverId,
                // No need to add api token
                /* apiToken:    $data->apiToken */
            );

            $log = $installer->uninstall();

            return response()->json([
                'status' => 'success',
                'log'    => $log,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
