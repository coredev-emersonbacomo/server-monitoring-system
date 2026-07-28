<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Models\Agent;
use App\Models\AgentIdentity;
use App\Models\AgentConfiguration;
use App\Models\Activity;
use App\Services\ProvisioningService;
use App\Services\HeartbeatService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class AgentController extends Controller
{
    public function __construct(
        private ProvisioningService $provisioningService
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

        $result = $this->provisioningService->register($validated['token'], $metadata);
        return response()->json($result, 200);
    }

    public function heartbeat(Request $request, HeartbeatService $heartbeatService): JsonResponse
    {
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $rawIdentity = substr($authHeader, 7);
        $identityHash = hash('sha256', $rawIdentity);

        $identity = AgentIdentity::where('identity_hash', $identityHash)
            ->where('status', 'active')
            ->first();

        if (!$identity) {
            return response()->json(['message' => 'Invalid or revoked agent identity.'], 403);
        }

        $payload = $request->all();
        $response = $heartbeatService->process($identity, $payload);

        return response()->json($response, 200);
    }

    /**
     * Called by the agent after it has successfully applied a config update received via WebSocket.
     * The agent authenticates using its Bearer identity token.
     */
    public function agentUpdate(string $serverUuid, Request $request): JsonResponse
    {
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $rawIdentity = substr($authHeader, 7);
        $identityHash = hash('sha256', $rawIdentity);

        $identity = AgentIdentity::where('identity_hash', $identityHash)
            ->where('status', 'active')
            ->first();

        if (!$identity) {
            return response()->json(['message' => 'Invalid or revoked agent identity.'], 403);
        }

        $agent = $identity->agent;
        if (!$agent) {
            return response()->json(['message' => 'Agent not found.'], 404);
        }

        $validated = $request->validate([
            'agent_version'      => ['nullable', 'string'],
            'heartbeat_interval' => ['nullable', 'integer', 'min:1'],
        ]);

        // Update the latest AgentConfiguration record
        $config = $agent->currentConfiguration;
        if ($config) {
            $updates = [];
            if (isset($validated['heartbeat_interval'])) {
                $updates['heartbeat_interval'] = $validated['heartbeat_interval'];
            }
            if (!empty($updates)) {
                $config->update($updates);
            }
        }

        // Update agent version if provided
        if (!empty($validated['agent_version'])) {
            $agent->update(['version' => $validated['agent_version']]);
        }

        // Log the update as an activity
        $server = $agent->server;
        Activity::create([
            'server_id'   => $server->id,
            'agent_id'    => $agent->id,
            'type'        => 'agent_version_updated',
            'description' => 'Agent version updated successfully.',
        ]);

        \App\Models\CustomActivityLog::create([
            'logable_type' => Server::class,
            'logable_id' => (string) $server->uuid,
            'user_id' => null,
            'user' => 'System',
            'action' => 'Agent Version Updated',
            'details' => json_encode([
                'message' => "Agent version updated successfully to version " . ($validated['agent_version'] ?? $agent->version) . " on server: {$server->name}",
                'server_name' => $server->name,
                'agent_version' => $validated['agent_version'] ?? $agent->version,
            ]),
        ]);

        return response()->json(['status' => 'ok']);
    }

    /**
     * Log that the agent is starting its binary update process.
     */
    public function agentUpdating(string $serverUuid, Request $request): JsonResponse
    {
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $rawIdentity = substr($authHeader, 7);
        $identityHash = hash('sha256', $rawIdentity);

        $identity = AgentIdentity::where('identity_hash', $identityHash)
            ->where('status', 'active')
            ->first();

        if (!$identity) {
            return response()->json(['message' => 'Invalid or revoked agent identity.'], 403);
        }

        $agent = $identity->agent;
        if (!$agent) {
            return response()->json(['message' => 'Agent not found.'], 404);
        }

        $validated = $request->validate([
            'version' => ['required', 'string'],
        ]);

        Activity::create([
            'server_id'   => $agent->server->id,
            'agent_id'    => $agent->id,
            'type'        => 'agent_updating',
            'description' => "Agent started download and update to v{$validated['version']}.",
        ]);

        \App\Models\AgentLog::create([
            'logable_type' => Server::class,
            'logable_id' => (string) $agent->server->uuid,
            'user_id' => null,
            'user' => 'System',
            'action' => 'Agent Updating',
            'details' => json_encode([
                'message' => "Agent started download and update to v{$validated['version']} on server: {$agent->server->name}",
                'server_name' => $agent->server->name,
                'version' => $validated['version'],
            ]),
        ]);

        return response()->json(['status' => 'ok']);
     }
 
     public function agentError(string $serverUuid, Request $request): JsonResponse
     {
         $authHeader = $request->header('Authorization');
         if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
             return response()->json(['message' => 'Unauthenticated.'], 401);
         }
 
         $rawIdentity = substr($authHeader, 7);
         $identityHash = hash('sha256', $rawIdentity);
 
         $identity = AgentIdentity::where('identity_hash', $identityHash)
             ->where('status', 'active')
             ->first();
 
         if (!$identity) {
             return response()->json(['message' => 'Invalid or revoked agent identity.'], 403);
         }
 
         $agent = $identity->agent;
         if (!$agent) {
             return response()->json(['message' => 'Agent not found.'], 404);
         }
 
         $validated = $request->validate([
             'error' => ['required', 'string'],
             'stack_trace' => ['nullable', 'string'],
         ]);
 
         Activity::create([
             'server_id'   => $agent->server->id,
             'agent_id'    => $agent->id,
             'type'        => 'agent_error',
             'description' => "Agent encountered error: " . substr($validated['error'], 0, 150),
         ]);
 
         \App\Models\AgentLog::create([
             'logable_type' => Server::class,
             'logable_id' => (string) $agent->server->uuid,
             'user_id' => null,
             'user' => 'System',
             'action' => 'Agent Error',
             'details' => json_encode([
                 'message' => "Agent encountered error on server: {$agent->server->name}",
                 'server_name' => $agent->server->name,
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

    public function uninstall(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'platform' => 'nullable|string',
        ]);

        $token = \App\Models\ProvisionToken::where('token', $validated['token'])->first();
        if (!$token) {
            return response()->json(['message' => 'Invalid provision token.'], 404);
        }

        $server = $token->server;
        if (!$server) {
            return response()->json(['message' => 'Server not found.'], 404);
        }

        $server->update([
            'agent_deleted' => true,
            'status' => \App\Enums\ServerStatus::Archived->value
        ]);

        event(new \App\Events\AgentUninstalled($server->uuid));

        \App\Models\Activity::create([
            'server_id' => $server->id,
            'agent_id' => $server->agent?->id,
            'type' => 'agent_uninstalled',
            'description' => 'Agent service has been uninstalled from the host.',
        ]);

        \App\Models\AgentLog::create([
            'logable_type' => Server::class,
            'logable_id' => (string) $server->uuid,
            'user_id' => null,
            'user' => 'Agent System',
            'action' => 'Agent Uninstalled',
            'details' => [
                'message' => "Agent uninstalled on host: {$server->name}",
                'server_name' => $server->name,
                'platform' => $validated['platform'] ?? 'unknown',
            ],
        ]);

        return response()->json(['status' => 'success', 'message' => 'Agent uninstalled and flag updated successfully.']);
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
