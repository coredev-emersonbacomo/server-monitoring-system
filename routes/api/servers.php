<?php

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
Route::post('/server/stats', function () {
    // 1. Receive data from the external server agent (e.g. JSON containing CPU, Memory).
    // $data = request()->validate([...]);

    // 2. Update the local database.
    // $server = Server::where('ip', request()->ip())->firstOrFail();
    // $server->metrics()->create($data); // Insert the new stat point

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
