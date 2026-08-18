<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AgentAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentBroadcastAuthController extends Controller
{
    /**
     * Authorize a Go agent's private Reverb channel subscription.
     *
     * The agent presents its short-lived agent JWT in the Authorization header.
     * We validate the token, confirm the agent owns the requested channel,
     * then return a Pusher-signed auth string.
     */
    public function authorize(Request $request, AgentAuthService $agentAuthService): JsonResponse
    {
        $agent = $agentAuthService->authenticate($request);
        if (!$agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $serverUuid = $agent->server->uuid;
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