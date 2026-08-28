<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ServerStatus;
use App\Events\AgentUninstalled;
use App\Events\ServerStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Agent;
use App\Models\AgentChallenge;
use App\Models\CustomActivityLog;
use App\Models\Server;
use App\Models\User;
use App\Services\AgentAuthService;
use App\Services\HeartbeatService;
use App\Services\ProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            if (! empty($result['conflict'])) {
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

    public function forceReinstall(string $uuid, Request $request): JsonResponse
    {
        $server = Server::where('uuid', $uuid)->firstOrFail();
        $user = $request->user();

        try {
            $result = $this->provisioningService->forceReinstallToken($server, $user);

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

        if (! $agent) {
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
        if (! $challenge || $challenge->status !== 'pending' || $challenge->expires_at->isPast()) {
            return response()->json(['message' => 'Challenge is invalid or expired.'], 401);
        }

        // Single-use claim — prevents a captured challenge/signature pair being replayed.
        $claimed = AgentChallenge::where('id', $challenge->id)
            ->where('status', 'pending')
            ->update(['status' => 'used', 'used_at' => now()]);
        if (! $claimed) {
            return response()->json(['message' => 'Challenge already used.'], 401);
        }

        $agent = $challenge->agent;
        if (! $agent || $agent->status !== 'active' || $agent->revoked_at || ! $agent->public_key) {
            return response()->json(['message' => 'Agent is revoked or disabled.'], 403);
        }

        // Per ADR-0002 §4, detaching a server keeps the agent and its identity
        // alive so its other servers keep monitoring. The per-server lifecycle
        // (unknown/unowned/deleted/archived) is enforced on the heartbeat path,
        // not at session issuance — otherwise detaching the agent's primary
        // server would lock every still-owned server offline (no session, so
        // no heartbeat, so shared `last_seen_at` freezes and all servers go
        // Offline). The session's `servers` list only carries servers this
        // agent still owns.
        $der = base64_decode($agent->public_key);
        $publicKeyPem = "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END PUBLIC KEY-----\n";
        $publicKey = openssl_pkey_get_public($publicKeyPem);
        if (! $publicKey) {
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
        if (! $agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // No-resurrection guard: a revoked agent or a decommissioned server must
        // never be flipped back to Online, no matter what the client sends.
        if ($agent->revoked_at) {
            return response()->json(['message' => 'Agent has been decommissioned.'], 403);
        }

        // Aggregated heartbeat: ONE request per agent tick carrying agent-wide
        // metrics once plus one filtered processes/ports partition per server.
        if (is_array($request->input('servers'))) {
            return response()->json(
                $heartbeatService->processAgent($agent, $request->all()),
                200
            );
        }

        // Legacy per-server heartbeat: each request targets exactly one server
        // by uuid, and the backend verifies ownership + lifecycle.
        $serverUuid = $request->input('server_uuid');
        if (! $serverUuid) {
            return response()->json(['message' => 'server_uuid is required.'], 422);
        }

        $server = Server::where('uuid', $serverUuid)->first();
        if (! $server) {
            return response()->json(['message' => 'Unknown server.'], 404);
        }

        if ($server->agent_id !== $agent->id) {
            return response()->json(['message' => 'Agent does not own this server.'], 403);
        }

        if ($server->agent_deleted || $server->status === ServerStatus::Archived->value) {
            return response()->json(['message' => 'Server has been decommissioned.'], 403);
        }

        $response = $heartbeatService->process($agent, $server, $request->all());

        return response()->json($response, 200);
    }

    public function agentError(Request $request): JsonResponse
    {
        $agent = $this->agentAuthService->authenticate($request);
        if (! $agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'error' => ['required', 'string'],
            'stack_trace' => ['nullable', 'string'],
            'server_uuid' => ['nullable', 'string'],
        ]);

        // Multi-server agent: report against the given server, falling back to the
        // legacy primary server for older agents.
        $server = null;
        if ($validated['server_uuid'] ?? null) {
            $server = Server::where('uuid', $validated['server_uuid'])
                ->where('agent_id', $agent->id)
                ->first();
        }
        $server ??= $agent->server ?? $agent->servers()->first();

        if (! $server) {
            return response()->json(['message' => 'No server associated with agent.'], 404);
        }

        Activity::create([
            'server_id' => $server->id,
            'agent_id' => $agent->id,
            'type' => 'agent_error',
            'description' => 'Agent encountered error: '.substr($validated['error'], 0, 150),
        ]);

        CustomActivityLog::create([
            'type' => 'agent',
            'logable_type' => Server::class,
            'logable_id' => (string) $server->uuid,
            'user_id' => null,
            'user' => 'System',
            'action' => 'Agent Error',
            'details' => json_encode([
                'message' => "Agent encountered error on server: {$server->name}",
                'server_name' => $server->name,
                'error' => $validated['error'],
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
     * Detach a single owned server from the agent. The agent stays installed and
     * keeps monitoring its other servers; only the named server is decommissioned
     * (status → agent_uninstalled, agent_id → null). Full agent revocation
     * (POST /agent/uninstall) is a separate operation used only when the agent
     * owns zero servers and the operator wants to remove the whole installation.
     */
    public function detachServer(Request $request, string $serverUuid): JsonResponse
    {
        $agent = $this->agentAuthService->authenticate($request);
        if (! $agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($agent->revoked_at) {
            return response()->json(['message' => 'Agent has been decommissioned.'], 403);
        }

        // The agent may only detach a server it actually owns.
        $server = Server::where('uuid', $serverUuid)
            ->where('agent_id', $agent->id)
            ->where('agent_deleted', false)
            ->where('status', '!=', ServerStatus::Archived->value)
            ->first();

        if (! $server) {
            return response()->json(['message' => 'Server not found or not owned by this agent.'], 404);
        }

        DB::transaction(function () use ($agent, $server) {
            $server->update([
                'agent_id' => null,
                'agent_deleted' => true,
                'status' => ServerStatus::AgentUninstalled->value,
            ]);

            event(new AgentUninstalled($server->uuid));

            Activity::create([
                'server_id' => $server->id,
                'agent_id' => $agent->id,
                'type' => 'server_detached',
                'description' => "Server {$server->name} detached from agent installation {$agent->installation_uuid}; agent remains installed.",
            ]);

            CustomActivityLog::create([
                'type' => 'agent',
                'logable_type' => Server::class,
                'logable_id' => (string) $server->uuid,
                'user_id' => null,
                'user' => 'Agent System',
                'action' => 'Server Detached',
                'details' => [
                    'message' => "Server {$server->name} removed from agent; the agent remains installed for its other servers.",
                    'server_name' => $server->name,
                ],
            ]);
        });

        $remaining = $agent->monitoredServers()->where('agent_deleted', false)->count();

        return response()->json([
            'status' => 'success',
            'server_uuid' => $server->uuid,
            'agent_revoked' => false,
            'agent_remaining_servers' => $remaining,
            'message' => 'Server detached from agent; the agent remains installed.'
            .($remaining === 0
                ? ' The agent now owns zero servers and is eligible for full uninstall.'
                : ' The agent continues monitoring its other servers'),
        ]);
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
        if (! $agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string',
        ]);

        $this->revokeAgentRecord($agent, $validated['reason'] ?? null, null);

        return response()->json([
            'status' => 'success',
            'revoked_agent_id' => $agent->id,
            'servers_detached' => $agent->monitoredServers->count(),
            'message' => 'Agent revoked.'
                .($agent->monitoredServers->isNotEmpty()
                    ? ' All monitored servers marked as agent uninstalled.'
                    : ' No monitored servers to detach.'),
        ]);
    }

    /**
     * Dashboard-side cleanup of an orphaned agent record. Used only when the host
     * agent was already uninstalled/removed but its DB record was never cleared
     * (e.g. the local script could not reach the backend). It mirrors the DB
     * effects of the agent's own uninstall but is initiated by a dashboard user
     * and gated on liveness: a still-reporting agent must be uninstalled on the
     * host, not deregistered here.
     */
    public function deregister(string $uuid, Request $request): JsonResponse
    {
        $server = Server::where('uuid', $uuid)->firstOrFail();
        $agent = $server->agent;

        if (! $agent) {
            return response()->json(['message' => 'This server has no agent record to clear.'], 422);
        }

        if ($agent->isAlive()) {
            return response()->json([
                'message' => 'Agent is still actively reporting to the server. Run the uninstall script on the host (or wait until it is deemed offline) before clearing its record here.',
            ], 409);
        }

        $user = $request->user();
        $this->revokeAgentRecord($agent, 'cleared from dashboard', $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Agent record cleared. Monitored servers marked as agent uninstalled.',
        ]);
    }

    /**
     * Revoke an agent identity and detach every server it monitors. Shared by the
     * agent's own uninstall and the dashboard deregister; the actor distinguishes
     * who initiated the removal (the agent itself vs a dashboard user).
     */
    private function revokeAgentRecord(Agent $agent, ?string $reason, ?User $actor): void
    {
        $agent->loadMissing(['monitoredServers', 'server']);
        $servers = $agent->monitoredServers;

        DB::transaction(function () use ($agent, $servers) {
            // Revoke the agent so its identity can never authenticate again.
            $agent->update([
                'status' => 'revoked',
                'revoked_at' => now(),
                'last_seen_at' => null,
            ]);

            // Every server this installation monitored has its agent detached and marked uninstalled,
            // and transitions to offline status immediately (without auto-archiving).
            foreach ($servers as $server) {
                $server->update([
                    'agent_deleted' => true,
                    'status' => ServerStatus::AgentUninstalled->value,
                    'agent_id' => null,
                    'went_offline_at' => now(),
                ]);
            }
        });

        foreach ($servers as $server) {
            event(new ServerStatusUpdated($server->uuid, ServerStatus::Offline->value, $server->name));
            event(new AgentUninstalled($server->uuid));
        }

        // Activity context falls back across the primary server and any
        // remaining monitored server. An active agent always has a primary.
        $contextServer = $agent->server ?? $servers->first();

        Activity::create([
            'server_id' => $contextServer->id,
            'agent_id' => $agent->id,
            'type' => 'agent_uninstalled',
            'description' => 'Agent record cleared from the dashboard.'
                .($reason ? ' Reason: '.$reason : ''),
        ]);

        CustomActivityLog::create([
            'type' => 'agent',
            'logable_type' => Server::class,
            'logable_id' => (string) $contextServer->uuid,
            'user_id' => $actor?->id,
            'user' => $actor?->name ?? 'Agent System',
            'action' => 'Agent Deregistered',
            'details' => [
                'message' => "Agent record cleared from dashboard on host: {$contextServer->name}. Servers detached: {$servers->count()}.",
                'server_name' => $contextServer->name,
            ],
        ]);
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

    public function detachLinux(): Response
    {
        $scriptPath = public_path('detach.sh');
        $script = file_exists($scriptPath) ? file_get_contents($scriptPath) : '';
        $script = str_replace('{{APP_URL}}', url('/'), $script);

        return response($script, 200, ['Content-Type' => 'text/plain']);
    }

    public function detachWindows(): Response
    {
        $scriptPath = public_path('detach.ps1');
        $script = file_exists($scriptPath) ? file_get_contents($scriptPath) : '';
        $script = str_replace('{{APP_URL}}', url('/'), $script);

        return response($script, 200, ['Content-Type' => 'text/plain']);
    }
}
