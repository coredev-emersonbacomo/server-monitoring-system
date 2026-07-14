<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Models\Agent;
use App\Models\AgentIdentity;
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
}
