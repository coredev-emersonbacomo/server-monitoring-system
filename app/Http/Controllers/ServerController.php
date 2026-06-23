<?php

namespace App\Http\Controllers;

use App\Data\ServerData;
use App\Models\Client;
use App\Models\Server;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Crypt;
use Infrastructure\Api\ApiGenerator;
// Install Service
use Infrastructure\Service\InstallerService;

class ServerController extends Controller
{
    public function index(int $client_id): JsonResponse
    {
        $servers = Server::where('client_id', $client_id)->get()->map(fn ($s) => [
            'id' => $s->id,
            'client_id' => $s->client_id,
            'server_name' => $s->server_name,
            'device_name' => $s->device_name,
            'internal_ip' => $s->internal_ip,
            'external_ip' => $s->external_ip,
            'ssh_username' => $s->ssh_username,
            'cpu_cores' => $s->cpu_cores,
            'ram' => $s->ram,
            'operating_system' => $s->operating_system,
            'created_at' => $s->created_at?->toIso8601String() ?? '',
            'updated_at' => $s->updated_at?->toIso8601String() ?? '',
        ]);

        return response()->json($servers);
    }

    public function store(ServerData $data, int $client_id): JsonResponse
    {
        $clientExist = Client::where('id', $client_id)->exists();

        if (!$clientExist) {
            return response()->json(['error' => 'Client not found.'], 400);
        }

        $server = Server::create([
            'client_id' => $client_id,
            'server_name' => $data->server_name,
            'device_name' => $data->device_name ?? $data->server_name,
            'internal_ip' => $data->internal_ip,
            'external_ip' => $data->external_ip ?? $data->internal_ip,
            'ssh_username' => $data->ssh_username,
            'ssh_password' => $data->ssh_password ? Crypt::encryptString($data->ssh_password) : null,
            'api_key' => ApiGenerator::GenerateApiKey(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $server,
        ], 201);
    }

    public function show(int $client_id, int $id): JsonResponse
    {
        $server = Server::where('client_id', $client_id)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $server,
        ]);
    }

    public function update(ServerData $data, int $client_id, int $id): JsonResponse
    {
        $server = Server::where('client_id', $client_id)
            ->where('id', $id)
            ->firstOrFail();

        $updateData = [
            'server_name' => $data->server_name,
            'internal_ip' => $data->internal_ip,
        ];

        if ($data->device_name !== null) {
            $updateData['device_name'] = $data->device_name;
        }
        if ($data->external_ip !== null) {
            $updateData['external_ip'] = $data->external_ip;
        }
        if ($data->ssh_username !== null) {
            $updateData['ssh_username'] = $data->ssh_username;
        }
        if ($data->ssh_password !== null) {
            $updateData['ssh_password'] = Crypt::encryptString($data->ssh_password);
        }

        $server->update($updateData);

        return response()->json([
            'success' => true,
            'data' => $server,
        ]);
    }

    public function destroy(int $client_id, int $id): JsonResponse
    {
        $server = Server::where('client_id', $client_id)
            ->where('id', $id)
            ->firstOrFail();

        $server->delete();

        return response()->json([
            'success' => true,
            'data' => $server,
        ]);
    }

    public function installServer(ServerData $data): JsonResponse
    {
        try {
            $installer = new InstallerService(
                sshHost:     $data->sshHost,
                sshPort:     $data->sshPort,
                sshUser:     $data->sshUser,
                sshPassword: $data->sshPassword,
                serverId:    $data->serverId,
                apiToken:    $data->apiToken,
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
}
