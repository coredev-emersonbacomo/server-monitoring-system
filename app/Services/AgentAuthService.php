<?php

namespace App\Services;

use App\Models\Agent;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;

/**
 * Issues and validates short-lived agent session credentials.
 *
 * Agent authentication is challenge-response based on a registered public key.
 * On success the backend hands out a short-lived JWT (this service) which the
 * agent keeps only in process memory and uses for heartbeats, agent updates and
 * the Reverb private-channel subscription. There is no persistent token.
 */
class AgentAuthService
{
    private string $secret;

    private int $accessTtl;

    public function __construct()
    {
        $this->secret = Config::get('jwt.secret');
        $this->accessTtl = (int) Config::get('agent.session_ttl', 900); // seconds
    }

    public function accessTtl(): int
    {
        return $this->accessTtl;
    }

    /**
     * Build the full session payload handed to the agent after a successful
     * challenge-response. Everything here is short-lived or public-by-design;
     * nothing is meant to be persisted by the agent.
     */
    public function issueSession(Agent $agent): array
    {
        $agent->loadMissing('monitoredServers');
        $servers = $agent->monitoredServers;
        // Prefer the legacy primary pointer only while it is still an owned,
        // active server (monitoredServers already excludes deleted/archived);
        // otherwise fall back to the first server the agent still owns so the
        // legacy server_uuid / JWT `svr` claim never points at a decommissioned
        // server.
        $primary = $servers->firstWhere('id', $agent->server_id) ?: $servers->first();

        $heartbeatInterval = (int) $agent->currentConfiguration?->heartbeat_interval;
        if ($heartbeatInterval <= 0) {
            $heartbeatInterval = (int) (Setting::get('heartbeat_interval') ?: 5);
        }

        return [
            'access_token' => $this->issueToken($agent->id, $primary?->uuid ?? ''),
            'expires_in' => $this->accessTtl,
            'websocket_expires_in' => $this->accessTtl,
            // Legacy single-server field (first/primary owned server) kept for
            // backward compatibility; new agents use the servers list.
            'server_uuid' => $primary?->uuid ?? '',
            'servers' => $servers->map(fn ($server) => [
                'server_uuid' => $server->uuid,
                'port_filter' => $server->port_filter ?? null,
                'process_filter' => $server->process_filter ?? null,
                'network_filter' => $server->network_filter ?? null,
            ])->values(),
            'config' => [
                'heartbeat_interval' => $heartbeatInterval,
                'realtime' => [
                    'host' => env('REVERB_HOST', '127.0.0.1'),
                    'port' => (int) env('REVERB_PORT', 8080),
                    'scheme' => env('REVERB_SCHEME', 'http'),
                    'app_key' => env('REVERB_APP_KEY'),
                ],
            ],
        ];
    }

    public function issueToken(int $agentId, string $serverUuid): string
    {
        $now = now()->timestamp;
        $header = $this->b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = $this->b64url(json_encode([
            'sub' => $agentId,
            'kind' => 'agent',
            'svr' => $serverUuid,
            'iat' => $now,
            'exp' => $now + $this->accessTtl,
        ]));
        $signature = $this->b64url(hash_hmac('sha256', "$header.$payload", $this->secret, true));

        return "$header.$payload.$signature";
    }

    /**
     * Resolve an authenticated active agent from the Bearer header, or null.
     */
    public function authenticate(Request $request): ?Agent
    {
        $authHeader = $request->header('Authorization');
        if (! $authHeader || ! str_starts_with($authHeader, 'Bearer ')) {
            return null;
        }

        $data = $this->validateToken(substr($authHeader, 7));
        if (! $data || ($data->kind ?? '') !== 'agent' || ! isset($data->sub)) {
            return null;
        }

        $agent = Agent::with('server')->find($data->sub);
        if (! $agent || $agent->status !== 'active') {
            return null;
        }

        return $agent;
    }

    public function validateToken(string $token): ?object
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$header, $payload, $signature] = $parts;

        $expected = $this->b64url(hash_hmac('sha256', "$header.$payload", $this->secret, true));
        if (! hash_equals($expected, $signature)) {
            return null;
        }

        $data = json_decode($this->b64urlDecode($payload));
        if (! $data || ! isset($data->exp) || (int) $data->exp < now()->timestamp) {
            return null;
        }

        return $data;
    }

    private function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function b64urlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
