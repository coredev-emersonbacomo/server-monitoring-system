<?php

namespace App\Services;

use App\Models\Server;
use App\Models\User;
use App\Models\ProvisionToken;
use App\Models\AgentInstallation;
use App\Models\Agent;
use App\Models\AgentIdentity;
use App\Models\AgentConfiguration;
use App\Models\Activity;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Events\ProvisionTokenGenerated;
use App\Events\RegistrationCompleted;
use App\Enums\ServerStatus;
use Carbon\Carbon;

class ProvisioningService
{
    public function generateToken(Server $server, ?User $user = null): array
    {
        if ($server->status === ServerStatus::Archived->value) {
            throw new \InvalidArgumentException("Cannot generate provision token for archived servers.");
        }

        // Check if there is already an active agent
        if ($server->agent()->exists()) {
            throw new \InvalidArgumentException("Server already has an active agent installed.");
        }

        // Check for active token
        $activeToken = $server->activeProvisionToken;
        if ($activeToken && !$activeToken->isExpired()) {
            return [
                'conflict' => true,
                'expires_at' => $activeToken->expires_at->copy()->utc()->toIso8601String(),
                'generated_at' => $activeToken->created_at->copy()->utc()->toIso8601String(),
                'remaining_seconds' => now()->diffInSeconds($activeToken->expires_at, false),
                'token_expires_in' => $activeToken->expires_at->copy()->utc()->timestamp,
            ];
        }

        // Generate new token
        $rawToken = Str::random(64);
        $tokenHash = hash('sha256', $rawToken);
        $expiresAt = Carbon::now('UTC')->addMinutes(30);

        $token = DB::transaction(function () use ($server, $tokenHash, $expiresAt, $user) {
            // Revoke any previous active tokens
            ProvisionToken::where('server_id', $server->id)
                ->where('status', 'active')
                ->update([
                    'status' => 'revoked',
                    'revoked_at' => Carbon::now('UTC'),
                ]);

            return ProvisionToken::create([
                'server_id' => $server->id,
                'token_hash' => $tokenHash,
                'status' => 'active',
                'expires_at' => $expiresAt,
                'created_by' => $user?->id,
            ]);
        });

        // Set server status to waiting_for_installation
        $server->update(['status' => ServerStatus::WaitingForInstallation->value]);

        // Log activity
        Activity::create([
            'server_id' => $server->id,
            'type' => 'provision_token_generated',
            'description' => 'Provision token generated.',
            'performed_by' => $user?->id,
        ]);

        // Broadcast event
        event(new ProvisionTokenGenerated($server->uuid, $expiresAt->toIso8601String()));

        return [
            'conflict' => false,
            'token' => $rawToken,
            'expires_at' => $expiresAt->toIso8601String(),
            'linux_command' => 'curl -fsSL ' . url('/install/linux') . ' | bash -s -- ' . $rawToken,
            'windows_command' => 'powershell -ExecutionPolicy Bypass -Command "`$token=\'' . $rawToken . '\'; irm ' . url('/install/windows.ps1') . ' | iex"',
            'token_expires_in' => $expiresAt->timestamp,
        ];
    }

    public function regenerateToken(Server $server, ?User $user = null): array
    {
        // Revoke any active tokens
        ProvisionToken::where('server_id', $server->id)
            ->where('status', 'active')
            ->update([
                'status' => 'revoked',
                'revoked_at' => Carbon::now('UTC'),
            ]);

        Activity::create([
            'server_id' => $server->id,
            'type' => 'provision_token_revoked',
            'description' => 'Previous provision token revoked for regeneration.',
            'performed_by' => $user?->id,
        ]);

        return $this->generateToken($server, $user);
    }

    public function bootstrap(string $rawToken, array $metadata): array
    {
        $tokenHash = hash('sha256', $rawToken);
        $token = ProvisionToken::where('token_hash', $tokenHash)->first();

        if (!$token || !$token->isValid()) {
            abort(410, 'Provision token is invalid, expired, or has already been used.');
        }

        $server = $token->server;

        // Record installation attempt
        $installation = AgentInstallation::create([
            'server_id' => $server->id,
            'installer_version' => $metadata['installer_version'] ?? '1.0',
            'operating_system' => $metadata['platform'] ?? null,
            'architecture' => $metadata['architecture'] ?? null,
            'hostname' => $metadata['hostname'] ?? null,
            'started_at' => Carbon::now('UTC'),
            'status' => 'started',
        ]);

        Activity::create([
            'server_id' => $server->id,
            'type' => 'provision_started',
            'description' => 'Agent provisioning started.',
        ]);

        // Select agent binary based on platform
        $platform = $metadata['platform'] ?? 'linux';

        if ($platform === 'windows') {
            $agentPath = public_path('agents/cs_agent/MonitorAgent.exe');
            $downloadUrl = url('/agents/cs_agent/MonitorAgent.exe');
        } else {
            $agentPath = public_path('agents/php_agent/agent.txt');
            $downloadUrl = url('/agents/php_agent/agent.txt');
        }

        $sha256 = file_exists($agentPath) ? hash_file('sha256', $agentPath) : '';
        $agentVersion = $platform === 'windows' ? '2.0' : '2.0';

        return [
            'download_url' => $downloadUrl,
            'expected_sha256' => $sha256,
            'agent_version' => $agentVersion,
            'heartbeat_interval' => 5,
            'api_url' => url('/api/v1/agent/heartbeat'),
            'register_url' => url('/api/v1/register'),
        ];
    }

    public function register(string $rawToken, array $metadata): array
    {
        $tokenHash = hash('sha256', $rawToken);
        $token = ProvisionToken::where('token_hash', $tokenHash)->first();

        if (!$token || $token->status !== 'active') {
            abort(410, 'Provision token is invalid or has already been used.');
        }

        $server = $token->server;

        return DB::transaction(function () use ($token, $server, $metadata) {
            // Invalidate provision token
            $token->update([
                'status' => 'used',
                'used_at' => Carbon::now('UTC'),
            ]);

            // Set Server Status
            $cpuSpec = $metadata['cpu'] ?? [];
            $server->update([
                'status' => ServerStatus::WaitingForFirstHeartbeat->value,
                'operating_system' => $metadata['operating_system'] ?? $server->operating_system,
                'architecture' => $metadata['architecture'] ?? $server->architecture,
                'host_name' => $metadata['hostname'] ?? $server->host_name,
                'cpu_model' => $cpuSpec['model'] ?? $server->cpu_model,
                'cpu_cores' => $cpuSpec['cores'] ?? $server->cpu_cores,
                'ram' => $metadata['memory'] ?? $server->ram,
                'disk' => $metadata['disk'] ?? $server->disk,
            ]);

            // Create Agent
            $agent = Agent::create([
                'server_id' => $server->id,
                'version' => $metadata['agent_version'] ?? '1.0',
                'protocol_version' => '1.0',
                'status' => 'registering',
                'registered_at' => Carbon::now('UTC'),
            ]);

            // Create Agent Identity
            $rawIdentity = 'agent_identity_' . Str::random(64);
            $identityHash = hash('sha256', $rawIdentity);

            AgentIdentity::create([
                'agent_id' => $agent->id,
                'identity_hash' => $identityHash,
                'status' => 'active',
                'issued_at' => Carbon::now('UTC'),
            ]);

            // Create Agent Configuration
            $configJson = [
                'heartbeat_interval' => 5,
                'metrics_interval' => 5,
                'port_scan_interval' => 60,
                'service_scan_interval' => 60,
                'process_scan_interval' => 60,
            ];

            AgentConfiguration::create([
                'agent_id' => $agent->id,
                'version' => 1,
                'heartbeat_interval' => 5,
                'metrics_interval' => 5,
                'port_scan_interval' => 60,
                'service_scan_interval' => 60,
                'process_scan_interval' => 60,
                'update_channel' => 'stable',
                'auto_update' => true,
                'configuration_json' => $configJson,
            ]);

            // Update installation record
            AgentInstallation::where('server_id', $server->id)
                ->where('status', 'started')
                ->latest()
                ->first()
                ?->update([
                    'status' => 'completed',
                    'completed_at' => Carbon::now('UTC'),
                ]);

            // Log activity
            Activity::create([
                'server_id' => $server->id,
                'agent_id' => $agent->id,
                'type' => 'registration_completed',
                'description' => 'Agent registration completed successfully.',
            ]);

            // Broadcast event
            event(new RegistrationCompleted($server->uuid, $agent->id));

            return [
                'identity' => $rawIdentity,
                'configuration' => $configJson,
                'heartbeat_interval' => 5,
            ];
        });
    }
}