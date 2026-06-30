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
use Illuminate\Support\Facades\DB;
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
        // 1. Check if client exists
        $clientExist = Client::where('id', $client_id)->exists();

        if (!$clientExist) {
            return response()->json(['error' => 'Client not found.'], 404); // 404 is more accurate here
        }

        try {
            // 2. Execute the database transaction
            // We pass variables into the closure using 'use ($data, $client_id)'
            $result = DB::transaction(function () use ($data, $client_id) {

                // Create the server entry
                $server = Server::create([
                    'client_id'    => $client_id,
                    'server_name'  => $data->server_name,
                    'device_name'  => $data->device_name ?? $data->server_name,
                    'internal_ip'  => $data->internal_ip,
                    'external_ip'  => $data->external_ip ?? $data->internal_ip,
                    'port'         => $data->port,
                    'ssh_username' => $data->ssh_username,
                    'ssh_password' => $data->ssh_password ? Crypt::encryptString($data->ssh_password) : null,
                    'api_key'      => ApiGenerator::GenerateApiKey(),
                ]);

                // Initialize the installer with correct keys matching your schema
                $installer = new InstallerService(
                    sshHost: $server->external_ip,
                    sshPort: $server->port,              // Fixed from $server->sshPort
                    sshUser: $server->ssh_username,
                    sshPassword: $data->ssh_password,     // Pass the raw password so SSH can actually log in
                    serverId: $server->id,
                    apiToken: $server->api_key            // Fixed from $server->apiToken
                );

                // Run the install. If this throws a RuntimeException, the transaction rolls back.
                $log = $installer->install();

                // Return both the logs and the created server model out of the transaction
                return [
                    'log'    => $log,
                    'server' => $server
                ];
            });

            // 3. Success Response (Only reached if transaction succeeds)
            return response()->json([
                'success' => true,
                'log'     => $result['log'],
                'data'    => $result['server'],
            ], 201);
        } catch (\RuntimeException $e) {
            // 4. Failure Response (Triggered if InstallerService fails, DB auto-rolls back)
            return response()->json([
                'status'  => 'error',
                'message' => 'Installation failed: ' . $e->getMessage(),
            ], 500);
        }
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

    public function uninstallServer(ServerSshData $data): JsonResponse
    {
        $sshPassword = Server::where('id', $data->serverId)
            ->value('ssh_password'); // Returns string or null

        // Since firstOrFail() throws a ModelNotFoundException, you can replicate that behavior like this:
        if (is_null($sshPassword)) {
            throw (new \Illuminate\Database\Eloquent\ModelNotFoundException)
                ->setModel(Server::class, [$data->serverId]);
        }

        try {
            $installer = new InstallerService(
                sshHost: $data->sshHost,
                sshPort: $data->sshPort,
                sshUser: $data->sshUser,
                sshPassword: Crypt::decryptString($sshPassword),
                serverId: $data->serverId,
<<<<<<< HEAD
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
=======
>>>>>>> fix/server-agent-install
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
