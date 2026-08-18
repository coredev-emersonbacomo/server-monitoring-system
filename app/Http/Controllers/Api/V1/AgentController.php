<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Models\Agent;
use App\Models\AgentChallenge;
use App\Models\Activity;
use App\Services\AgentAuthService;
use App\Services\ProvisioningService;
use App\Services\HeartbeatService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class AgentController extends Controller
{
    public function __construct(
        private ProvisioningService $provisioningService,
        private AgentAuthService $agentAuthService
    ) {}

    public function provision(string $uuid, Request $request): JsonResponse
    {
        $server = Server::where('uuid', $uuid)->firstOrFail();
        $user = $request->user();

        try {
            $result = $this->provisioningService->generateToken($server, $user);
            if (!empty($result['conflict'])) {
                return response()->json($result, 409);
            }
            return response()->json($result, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function regenerate(string $uuid, Request $request): JsonResponse
    {
        $server = Server::where('uuid', $uuid)->firstOrFail();
        $user = $request->user();

        try {
            $result = $this->provisioningService->regenerateToken($server, $user);
            return response()->json($result, 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function bootstrap(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'hostname' => 'nullable|string',
            'platform' => 'nullable|string',
            'architecture' => 'nullable|string',
            'installer_version' => 'nullable|string',
        ]);

        $metadata = [
            'platform' => $validated['platform'] ?? null,
            'architecture' => $validated['architecture'] ?? null,
            'hostname' => $validated['hostname'] ?? null,
            'installer_version' => $validated['installer_version'] ?? '1.0',
        ];

        $result = $this->provisioningService->bootstrap($validated['token'], $metadata);
        return response()->json($result, 200);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'installation_id' => 'required|string|max:36',
            'public_key' => 'required|string',
            'public_key_hash' => 'required|string|max:64',
            'agent_version' => 'nullable|string',
            'capabilities' => 'nullable|array',
            'hostname' => 'nullable|string',
            'operating_system' => 'nullable|string',
            'architecture' => 'nullable|string',
            'cpu.model' => 'nullable|string',
            'cpu.cores' => 'nullable|integer',
            'memory' => 'nullable|string',
            'disk' => 'nullable|string',
        ]);

        $metadata = [
            'installation_id' => $validated['installation_id'],
            'agent_version' => $validated['agent_version'] ?? '1.0',
            'capabilities' => $validated['capabilities'] ?? [],
            'hostname' => $validated['hostname'] ?? null,
            'operating_system' => $validated['operating_system'] ?? null,
            'architecture' => $validated['architecture'] ?? null,
            'cpu' => [
                'model' => $validated['cpu']['model'] ?? null,
                'cores' => $validated['cpu']['cores'] ?? null,
            ],
            'memory' => $validated['memory'] ?? null,
            'disk' => $validated['disk'] ?? null,
        ];

        $result = $this->provisioningService->register(
            $validated['token'],
            $metadata + [
                'public_key' => $validated['public_key'],
                'public_key_hash' => $validated['public_key_hash'],
            ]
        );
        return response()->json($result, 200);
    }

    /**
     * Step 1 of challenge-response authentication. The agent identifies itself
     * by its immutable installation UUID; the backend answers with a random,
     * short-lived, single-use challenge bound to that agent.
     */
    public function challenge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'installation_uuid' => 'required|string|max:36',
        ]);

        $agent = Agent::where('installation_uuid', $validated['installation_uuid'])
            ->where('status', 'active')
            ->first();

        if (!$agent) {
            return response()->json(['message' => 'Unknown or inactive agent.'], 403);
        }

        $challenge = bin2hex(random_bytes(32));
        $challengeModel = $agent->challenges()->create([
            'challenge' => $challenge,
            'status' => 'pending',
            'expires_at' => now()->addSeconds((int) config('agent.challenge_ttl', 60)),
        ]);

        return response()->json([
            'challenge_id' => $challengeModel->id,
            'challenge' => $challenge,
            'expires_in' => (int) config('agent.challenge_ttl', 60),
        ], 200);
    }

    /**
     * Step 2 of challenge-response authentication. Verifies the agent's
     * signature over the challenge using its registered public key, then
     * issues short-lived session credentials.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_id' => 'required|integer',
            'signature' => 'required|string',
        ]);

        $challenge = AgentChallenge::with('agent.server')->find($validated['challenge_id']);
        if (!$challenge || $challenge->status !== 'pending' || $challenge->expires_at->isPast()) {
            return response()->json(['message' => 'Challenge is invalid or expired.'], 401);
        }

        // Single-use claim — prevents a captured challenge/signature pair being replayed.
        $claimed = AgentChallenge::where('id', $challenge->id)
            ->where('status', 'pending')
            ->update(['status' => 'used', 'used_at' => now()]);
        if (!$claimed) {
            return response()->json(['message' => 'Challenge already used.'], 401);
        }

        $agent = $challenge->agent;
        if (!$agent || $agent->status !== 'active' || $agent->revoked_at || !$agent->public_key) {
            return response()->json(['message' => 'Agent is revoked or disabled.'], 403);
        }

        // A decommissioned server must never accept a session, even from a
        // still-active agent row — the no-resurrection guarantee.
        $server = $agent->server;
        if ($server && ($server->agent_deleted || $server->status === \App\Enums\ServerStatus::Archived->value)) {
            return response()->json(['message' => 'Server has been decommissioned.'], 403);
        }

        $der = base64_decode($agent->public_key);
        $publicKeyPem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
        $publicKey = openssl_pkey_get_public($publicKeyPem);
        if (!$publicKey) {
            return response()->json(['message' => 'Invalid registered public key.'], 500);
        }

        $signature = base64_decode($validated['signature']);
        $ok = openssl_verify($challenge->challenge, $signature, $publicKey, OPENSSL_ALGO_SHA256);
        if ($ok !== 1) {
            return response()->json(['message' => 'Signature verification failed.'], 403);
        }

        return response()->json($this->agentAuthService->issueSession($agent), 200);
    }

    public function heartbeat(Request $request, HeartbeatService $heartbeatService): JsonResponse
    {
        $agent = $this->agentAuthService->authenticate($request);
        if (!$agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // No-resurrection guard: a revoked agent or a decommissioned server must
        // never be flipped back to Online, no matter what the client sends.
        $server = $agent->server;
        if ($agent->revoked_at || !$server || $server->agent_deleted || $server->status === \App\Enums\ServerStatus::Archived->value) {
            return response()->json(['message' => 'Agent or server has been decommissioned.'], 403);
        }

        $response = $heartbeatService->process($agent, $request->all());
        return response()->json($response, 200);
    }

    public function agentError(Request $request): JsonResponse
     {
         $agent = $this->agentAuthService->authenticate($request);
         if (!$agent) {
             return response()->json(['message' => 'Unauthenticated.'], 401);
         }

         $validated = $request->validate([
             'error' => ['required', 'string'],
             'stack_trace' => ['nullable', 'string'],
         ]);

         $server = $agent->server;

         Activity::create([
             'server_id'   => $server->id,
             'agent_id'    => $agent->id,
             'type'        => 'agent_error',
             'description' => "Agent encountered error: " . substr($validated['error'], 0, 150),
         ]);

         \App\Models\CustomActivityLog::create([
             'type'         => 'agent',
             'logable_type' => Server::class,
             'logable_id'   => (string) $server->uuid,
             'user_id'      => null,
             'user'         => 'System',
             'action'       => 'Agent Error',
             'details'      => json_encode([
                 'message'     => "Agent encountered error on server: {$server->name}",
                 'server_name' => $server->name,
                 'error'       => $validated['error'],
                 'stack_trace' => $validated['stack_trace'] ?? '',
             ]),
         ]);

         return response()->json(['status' => 'ok']);
     }

    public function installLinux(): Response
    {
        $scriptPath = public_path('install.sh');
        $script = file_exists($scriptPath) ? file_get_contents($scriptPath) : '';
        $script = str_replace('{{APP_URL}}', url('/'), $script);
        return response($script, 200, ['Content-Type' => 'text/plain']);
    }

    public function installWindows(): Response
    {
        $scriptPath = public_path('install.ps1');
        $script = file_exists($scriptPath) ? file_get_contents($scriptPath) : '';
        $script = str_replace('{{APP_URL}}', url('/'), $script);
        return response($script, 200, ['Content-Type' => 'text/plain']);
    }

    /**
     * Uninstall is invoked BY THE AGENT ITSELF (the running service, acting
     * under the service account). The agent authenticates with its JWT session,
     * proving it still holds the identity key, then the backend revokes the
     * agent and archives the server. The agent deletes its keystore key locally.
     */
    public function uninstall(Request $request): JsonResponse
    {
        $agent = $this->agentAuthService->authenticate($request);
        if (!$agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string',
        ]);

        $server = $agent->server;
        if (!$server) {
            return response()->json(['message' => 'Server not found.'], 404);
        }

        DB::transaction(function () use ($agent, $server, $validated) {
            // Revoke the agent so its identity can never authenticate again.
            $agent->update([
                'status' => 'revoked',
                'revoked_at' => now(),
                'last_seen_at' => null,
            ]);

            $server->update([
                'agent_deleted' => true,
                'status' => \App\Enums\ServerStatus::Archived->value,
            ]);
        });

        event(new \App\Events\AgentUninstalled($server->uuid));

        \App\Models\Activity::create([
            'server_id' => $server->id,
            'agent_id' => $agent->id,
            'type' => 'agent_uninstalled',
            'description' => 'Agent service has been uninstalled from the host.'
                . (($validated['reason'] ?? null) ? ' Reason: ' . $validated['reason'] : ''),
        ]);

        \App\Models\CustomActivityLog::create([
            'type'         => 'agent',
            'logable_type' => Server::class,
            'logable_id'   => (string) $server->uuid,
            'user_id'      => null,
            'user'         => 'Agent System',
            'action'       => 'Agent Uninstalled',
            'details'      => [
                'message'     => "Agent uninstalled on host: {$server->name}",
                'server_name' => $server->name,
            ],
        ]);

        return response()->json(['status' => 'success', 'message' => 'Agent revoked and server archived successfully.']);
    }

    public function uninstallLinux(): Response
    {
        $scriptPath = public_path('uninstall.sh');
        $script = file_exists($scriptPath) ? file_get_contents($scriptPath) : '';
        $script = str_replace('{{APP_URL}}', url('/'), $script);
        return response($script, 200, ['Content-Type' => 'text/plain']);
    }

    public function uninstallWindows(): Response
    {
        $scriptPath = public_path('uninstall.ps1');
        $script = file_exists($scriptPath) ? file_get_contents($scriptPath) : '';
        $script = str_replace('{{APP_URL}}', url('/'), $script);
        return response($script, 200, ['Content-Type' => 'text/plain']);
    }
}