<?php

namespace App\Http\Controllers;

use App\Data\ServerData;
use App\Models\Client;
use App\Models\Server;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServerController extends Controller
{
    public function index($client_id): JsonResponse
    {
        $servers = Server::where('client_id', $client_id)->get();

        return response()->json($servers);
    }

    public function store(ServerData $data, $client_id): JsonResponse
    {
        $clientExist = Client::where('id', $client_id)->exists();

        if (!$clientExist) {
            return response()->json(['error' => 'Client not found.'], 400);
        }

        $server = Server::create([
            'client_id' => $client_id,
            'server_name' => $data->server_name,
            'device_name' => $data->device_name,
            'internal_ip' => $data->internal_ip,
            'external_ip' => $data->external_ip,
        ]);

        return response()->json([
            'success' => true,
            'data' => $server
        ], 201);
    }

    public function show($client_id, $id): JsonResponse
    {
        $server = Server::where('client_id', $client_id)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $server
        ]);
    }

    public function update(ServerData $data, $client_id, $id): JsonResponse
    {
        $server = Server::where('client_id', $client_id)
            ->where('id', $id)
            ->firstOrFail();

        $server->update([
            'server_name' => $data->server_name,
            'device_name' => $data->device_name,
            'internal_ip' => $data->internal_ip,
            'external_ip' => $data->external_ip,
        ]);

        return response()->json([
            'success' => true,
            'data' => $server
        ]);
    }

    public function destroy($client_id, $id): JsonResponse
    {
        $server = Server::where('client_id', $client_id)
            ->where('id', $id)
            ->firstOrFail();

        $server->delete();

        return response()->json([
            'success' => true,
            'data' => $server
        ]);
    }
}