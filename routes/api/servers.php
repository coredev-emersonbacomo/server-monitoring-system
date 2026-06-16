<?php

use App\Data\ServerUpdatesData;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::post('/server/stats', function (ServerUpdatesData $serverUpdatesData) {

    // 1. Authenticate using the DTO's token property
    $serverExists = DB::table('servers')
        ->where('id', $serverUpdatesData->server_id)
        ->where('api_token', $serverUpdatesData->token)
        ->exists();

    if (!$serverExists) {
        return response()->json(['error' => 'Unauthorized or invalid server ID.'], 401);
    }

    // 2. Directly insert the pre-validated, flattened DTO properties
    DB::table('server_updates')->insert([
        'server_id'      => $serverUpdatesData->server_id,
        'cpu_usage'      => $serverUpdatesData->cpu_usage,
        'memory_usage'   => $serverUpdatesData->memory_usage,
        'storage'        => $serverUpdatesData->storage,
        'uptime'         => $serverUpdatesData->uptime,
        'network_rbytes' => $serverUpdatesData->network_rbytes,
        'network_tbytes' => $serverUpdatesData->network_tbytes,
        'created_at'     => date('Y-m-d H:i:s', $serverUpdatesData->timestamp),
        'updated_at'     => now(),
    ]);

    return response()->json(['success' => true, 'message' => 'Metrics recorded.'], 200);
});
