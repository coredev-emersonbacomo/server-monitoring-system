<?php

use App\Data\ServerUpdatesData;
use App\Models\ServerUpdate;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Broadcasting\PrivateChannel;
use App\Models\Server;
use App\Events\ServerStatsUpdated;

/*
|--------------------------------------------------------------------------
| Server Routes
|--------------------------------------------------------------------------
*/

// Endpoint for external server agents to push live stats to the backend.
// The backend stores the stats and broadcasts to the React frontend via Reverb.
Route::post('/server/stats', function (ServerUpdatesData $serverUpdatesData, Request $request) {
    
    // 1. Receive data from the external server agent (e.g. JSON containing CPU, Memory).
    // ServerUpdate::create([
    //     'server_id' => 1, // In a real implementation, you'd identify the server by an API key or IP address
    //     'cpu_usage' => $serverUpdatesData->cpu_usage,
    //     'memory_usage' => $serverUpdatesData->memory_usage,
    //     'storage' => $serverUpdatesData->storage,
    //     'uptime' => $serverUpdatesData->uptime,
    //     'network_rbytes' => $serverUpdatesData->network_rbytes,
    //     'network_tbytes' => $serverUpdatesData->network_tbytes,
    // ]);
    Log::info("Received the post Here!!!");

    // 2. Update the local database.
    $server = ServerUpdate::where('server_id', $serverUpdatesData->server_id)->firstOrFail();
    $newServerUpdate = ServerUpdate::create([
        'server_id' => $serverUpdatesData->server_id,
        'cpu_usage' => $serverUpdatesData->cpu_usage,
        'memory_usage' => $serverUpdatesData->memory_usage,
        'storage' => $serverUpdatesData->storage,
        'uptime' => $serverUpdatesData->uptime,
        'network_rbytes' => $serverUpdatesData->network_rbytes,
        'network_tbytes' => $serverUpdatesData->network_tbytes,
    ]);



    // 3. SEC-OPS BEST PRACTICE: Scoped Broadcasting
    // Do not broadcast all servers to everyone! Filter the payload and use Private Channels.
    //
    // Example implementation:
    /*
    // Get only the users who are assigned to this specific server
    $usersAssignedToServer = $server->users()->get();

    // Fetch the updated server data to send (only the newest tick, not the full history)
    $serverPayload = $server->load(['metrics' => fn($q) => $q->latest()->limit(1), 'openPorts'])->toArray();

    // Build one array of private channels. Reverb will drop any user who is offline automatically.
    $channels = $usersAssignedToServer->map(fn($user) => new PrivateChannel('dashboard.' . $user->id))->toArray();

    // Broadcast ONCE to Reverb — it internally distributes only to users with open sockets.
    ServerStatsUpdated::dispatch($serverPayload)->onChannels($channels);
    */

    $mockCoopsPayload = [];

    // 4. Trigger the broadcast event!
    ServerStatsUpdated::dispatch($mockCoopsPayload);

    return response()->json(['status' => 'success']);
});
