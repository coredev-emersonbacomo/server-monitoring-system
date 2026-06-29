<?php

use App\Data\ServerData;
use App\Data\ServerUpdatesData;
use App\Events\ServerStatsUpdated;
use App\Http\Controllers\ServerController;
use App\Models\Server;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:jwt')->group(function () {
    // All servers with status (for server list page)
    Route::get('/servers', function (Illuminate\Http\Request $request) {
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
                'servers.id',
                'servers.server_name',
                'servers.device_name',
                'servers.internal_ip',
                'servers.external_ip',
                'servers.cpu_cores',
                'servers.ram',
                'servers.operating_system',
                'servers.client_id',
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

        if ($clientId = $request->query('client_id')) {
            $query->where('servers.client_id', $clientId);
        }

        return response()->json($query->get());
    });

    // Prefix client ex. {clients/1/servers/1}
    Route::prefix('/clients/{client_id}')->whereNumber('client_id')->group(function () {
        Route::get('/servers', [ServerController::class, 'index']);
        Route::post('/servers', [ServerController::class, 'store']);
        Route::get('/servers/{id}', [ServerController::class, 'show']);
        Route::put('/servers/{id}', [ServerController::class, 'update']);
        Route::delete('/servers/{id}', [ServerController::class, 'destroy']);
        Route::post('/servers/uninstall', [ServerController::class, 'uninstallServer']);
    });
});

// Compute MB/s from two consecutive rows
if (!function_exists('computeStatPoint')) {
function computeStatPoint(object $row, ?object $prev): array
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
}

// ── Fetch server details + historical stats ─────────────────────────────────

Route::get('/servers/{id}', function (int $id) {
    $server = DB::table('servers')->where('id', $id)->first();
    if (!$server) {
        return response()->json(['error' => 'Server not found.'], 404);
    }

    $updates = DB::table('server_updates')
        ->where('server_id', $id)
        ->orderBy('created_at')
        ->limit(144)
        ->get();

    $stats = [];
    $prev = null;
    foreach ($updates as $row) {
        $stats[] = computeStatPoint($row, $prev);
        $prev = $row;
    }

    $client = DB::table('clients')
        ->where('id', $server->client_id)
        ->first();

    return ServerData::from([
        'id'               => $server->id,
        'server_name'      => $server->server_name,
        'device_name'      => $server->device_name,
        'internal_ip'      => $server->internal_ip,
        'external_ip'      => $server->external_ip,
        'cpu_cores'        => $server->cpu_cores ?? null,
        'ram'              => $server->ram ?? null,
        'operating_system' => $server->operating_system ?? null,
        'client_id'        => $server->client_id,
        'client_name'      => $client?->name ?? 'Unknown',
        'stats'            => $stats,
    ]);
})->whereNumber('id');

// ── Ingest agent stats ──────────────────────────────────────────────────────

Route::post('/server/stats', function (ServerUpdatesData $serverUpdatesData) {

    $serverInfo = DB::table('servers')
        ->where('id', $serverUpdatesData->server_id)
        ->where('api_key', $serverUpdatesData->token)
        ->first();

    if (!$serverInfo) {
        return response()->json(['error' => 'Unauthorized or invalid server ID.'], 401);
    }

    $timestamp = $serverUpdatesData->timestamp;

    DB::table('server_updates')->insert([
        'server_id'      => $serverUpdatesData->server_id,
        'cpu_usage'      => $serverUpdatesData->cpu_usage,
        'memory_usage'   => $serverUpdatesData->memory_usage,
        'storage'        => $serverUpdatesData->storage,
        'uptime'         => $serverUpdatesData->uptime,
        'network_rbytes' => $serverUpdatesData->network_rbytes,
        'network_tbytes' => $serverUpdatesData->network_tbytes,
        'created_at'     => date('Y-m-d H:i:s', $timestamp),
        'updated_at'     => now(),
    ]);

    // Fetch the newly inserted row and the one before it for rate calculation
    $rows = DB::table('server_updates')
        ->where('server_id', $serverUpdatesData->server_id)
        ->orderByDesc('created_at')
        ->limit(2)
        ->get();

    $latest = $rows->first();
    $prev   = $rows->count() > 1 ? $rows->last() : null;

    $point = $latest ? computeStatPoint($latest, $prev) : [];

    $server = [
        'id'               => $serverInfo->id,
        'server_name'      => $serverInfo->server_name,
        'device_name'      => $serverInfo->device_name,
        'internal_ip'      => $serverInfo->internal_ip,
        'external_ip'      => $serverInfo->external_ip,
        'cpu_cores'        => $serverInfo->cpu_cores ?? null,
        'ram'              => $serverInfo->ram ?? null,
        'operating_system' => $serverInfo->operating_system ?? null,
    ];

    ServerStatsUpdated::dispatch($serverUpdatesData->server_id, $point, $server);

    return response()->json(['success' => true, 'message' => 'Metrics recorded.'], 200);
});
