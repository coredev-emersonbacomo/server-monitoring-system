<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AgentIdentity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;

class AgentBroadcastAuthController extends Controller
{
    /**
     * Authorize a Go agent's private Reverb channel subscription.
     *
     * The agent passes its Bearer identity token in the Authorization header.
     * We validate the token, confirm the agent owns the requested channel,
     * then return a Pusher-signed auth string.
     */
    public function authorize(Request $request): JsonResponse
    {
        $authHeader = $request->header('Authorization') ?? $request->header('X-Agent-Auth');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $rawIdentity = substr($authHeader, 7);
        $identityHash = hash('sha256', $rawIdentity);

        $identity = AgentIdentity::where('identity_hash', $identityHash)
            ->where('status', 'active')
            ->with('agent.server')
            ->first();

        if (!$identity || !$identity->agent?->server) {
            return response()->json(['message' => 'Invalid or revoked agent identity.'], 403);
        }

        $serverUuid = $identity->agent->server->uuid;
        $channelName = $request->input('channel_name', '');
        $socketId    = $request->input('socket_id', '');

        // Validate the agent is only subscribing to its own channel
        $expectedChannel = 'private-agent.' . $serverUuid;
        if ($channelName !== $expectedChannel) {
            return response()->json(['message' => 'Channel not authorized.'], 403);
        }

        // Generate the Pusher HMAC auth signature
        // Format: "{socket_id}:{channel_name}" signed with REVERB_APP_SECRET
        $appKey    = env('REVERB_APP_KEY');
        $appSecret = env('REVERB_APP_SECRET');

        $stringToSign = $socketId . ':' . $channelName;
        $signature    = hash_hmac('sha256', $stringToSign, $appSecret);
        $auth         = $appKey . ':' . $signature;

        return response()->json(['auth' => $auth]);
    }
}
