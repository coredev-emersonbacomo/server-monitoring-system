<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ServerStatus;
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
        if (! $agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $channelName = $request->input('channel_name', '');
        $socketId = $request->input('socket_id', '');

        // Validate the agent only subscribes to channels of servers it owns.
        // A multi-server agent may hold one private channel per server.
        $prefix = 'private-agent.';
        if (! str_starts_with($channelName, $prefix)) {
            return response()->json(['message' => 'Channel not authorized.'], 403);
        }
        $serverUuid = substr($channelName, strlen($prefix));

        $owns = $agent->servers()
            ->where('uuid', $serverUuid)
            ->where('agent_deleted', false)
            ->where('status', '!=', ServerStatus::Archived->value)
            ->exists();
        if (! $owns) {
            return response()->json(['message' => 'Channel not authorized.'], 403);
        }

        // Generate the Pusher HMAC auth signature
        // Format: "{socket_id}:{channel_name}" signed with REVERB_APP_SECRET
        $appKey = env('REVERB_APP_KEY');
        $appSecret = env('REVERB_APP_SECRET');

        $stringToSign = $socketId.':'.$channelName;
        $signature = hash_hmac('sha256', $stringToSign, $appSecret);
        $auth = $appKey.':'.$signature;

        return response()->json(['auth' => $auth]);
    }
}
