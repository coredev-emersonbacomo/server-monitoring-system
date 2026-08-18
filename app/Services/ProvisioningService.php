<?php

namespace App\Services;

use App\Models\Server;
use App\Models\User;
use App\Models\ProvisionToken;
use App\Models\AgentInstallation;
use App\Models\Agent;
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
        $expiresAt = now()->addMinutes(30);

        $token = DB::transaction(function () use ($server, $rawToken, $expiresAt, $user) {
            // Revoke any previous active tokens
            ProvisionToken::where('server_id', $server->id)
                ->where('status', 'active')
                ->update([
                    'status' => 'revoked',
                    'revoked_at' => now(),
                ]);

            return ProvisionToken::create([
                'server_id' => $server->id,
                'token' => $rawToken,
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

        \App\Models\CustomActivityLog::create([
            'type'         => 'agent',
            'logable_type' => Server::class,
            'logable_id'   => (string) $server->uuid,
            'user_id'      => $user?->id,
            'user'         => $user ? "{$user->first_name} {$user->last_name}" : 'System',
            'action'       => 'Generate Installation Command',
            'details'      => json_encode([
                'message'          => "Generated installation command for server: {$server->name}",
                'server_name'      => $server->name,
                'token_expires_at' => $expiresAt->toIso8601String(),
            ]),
        ]);

        // Broadcast event
        event(new ProvisionTokenGenerated($server->uuid, $expiresAt->toIso8601String()));

        return [
            'conflict' => false,
            'token' => $rawToken,
            'expires_at' => $expiresAt->toIso8601String(),
            'linux_command' => 'sudo curl -fsSL ' . url('/install/linux') . ' | sudo bash -s -- ' . $rawToken,
            'windows_command' => \App\Services\WindowsCommand::make('/install/windows.ps1', $rawToken, rtrim(url('/'), '/')),
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
                'revoked_at' => now(),
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
        $token = ProvisionToken::where('token', $rawToken)->first();

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
            'started_at' => now(),
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
            $agentPath = public_path('MonitorAgent.exe');
            $downloadUrl = url('/MonitorAgent.exe');
        } else {
            $agentPath = public_path('agent');
            $downloadUrl = url('/agent');
        }

        $sha256 = file_exists($agentPath) ? hash_file('sha256', $agentPath) : '';
        $latestAgentVersion = \App\Models\AgentVersion::orderBy('id', 'desc')->first();
        $agentVersion = $latestAgentVersion ? $latestAgentVersion->version : '2.0';

        return [
            'download_url' => $downloadUrl,
            'expected_sha256' => $sha256,
            'agent_version' => $agentVersion,
            'server_url' => url('/'),
        ];
    }

    public function register(string $rawToken, array $metadata): array
    {
        $token = ProvisionToken::where('token', $rawToken)->first();

        if (!$token || $token->status !== 'active') {
            abort(410, 'Provision token is invalid or has already been used.');
        }

        $server = $token->server;

        // Every installation carries an immutable UUID generated at install time.
        // It is the binding between the agent process, its keystore identity and
        // the backend agent row.
        $installationId = $metadata['installation_id'] ?? null;
        if (!$installationId || strlen($installationId) > 36) {
            abort(422, 'A valid installation_id is required for registration.');
        }

        // The agent proves its identity by possessing a locally generated private
        // key; it registers only the matching public key with the backend.
        $publicKey = $metadata['public_key'] ?? null;
        $publicKeyHash = $metadata['public_key_hash'] ?? null;
        if (!$publicKey || !$publicKeyHash || strlen($publicKeyHash) !== 64) {
            abort(422, 'A valid public key and public key hash are required for registration.');
        }

        return DB::transaction(function () use ($token, $server, $metadata, $installationId, $publicKey, $publicKeyHash) {
            // Invalidate provision token
            $token->update([
                'status' => 'used',
                'used_at' => now(),
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

            // The same physical installation can only ever be bound to one
            // server. An installation UUID that already belongs to another
            // server is rejected outright.
            $bound = Agent::where('installation_uuid', $installationId)->first();
            if ($bound && $bound->server_id !== $server->id) {
                abort(409, 'This installation is already registered to another server.');
            }

            $active = $server->agent;
            $isSameInstallation = $active && $active->installation_uuid === $installationId;

            if ($active && $isSameInstallation) {
                // Re-registration of the same installation: the agent retries
                // with a stale token, or reclaims its own row after an
                // uninstall. Update in place — never create a second row.
                $agent = $active;
                $agent->update([
                    'public_key' => $publicKey,
                    'public_key_hash' => $publicKeyHash,
                    'version' => $metadata['agent_version'] ?? $agent->version,
                    'status' => 'active',
                    'revoked_at' => null,
                    'last_seen_at' => null,
                ]);
            } else {
                // A different installation is taking over this server, or this
                // is the first registration. If an active agent already exists
                // it must be revoked first (the partial unique index only ever
                // allows ONE active agent per server).
                if ($active) {
                    $active->update([
                        'status' => 'revoked',
                        'revoked_at' => now(),
                        'last_seen_at' => null,
                    ]);
                }

                if ($bound) {
                    // Reinstall with the same installation UUID after its own
                    // uninstall: reactivate the historical row in place.
                    $agent = $bound;
                    $agent->update([
                        'public_key' => $publicKey,
                        'public_key_hash' => $publicKeyHash,
                        'version' => $metadata['agent_version'] ?? $agent->version,
                        'status' => 'active',
                        'revoked_at' => null,
                        'last_seen_at' => null,
                    ]);
                } else {
                    $agent = Agent::create([
                        'server_id' => $server->id,
                        'installation_uuid' => $installationId,
                        'version' => $metadata['agent_version'] ?? '1.0',
                        'protocol_version' => '1.0',
                        'public_key' => $publicKey,
                        'public_key_hash' => $publicKeyHash,
                        'status' => 'active',
                        'registered_at' => now(),
                    ]);

                    $heartbeatInterval = (int) (\App\Models\Setting::get('heartbeat_interval') ?: 5);

                    $configJson = [
                        'heartbeat_interval' => $heartbeatInterval,
                        'metrics_interval' => 5,
                        'port_scan_interval' => 60,
                        'service_scan_interval' => 60,
                        'process_scan_interval' => 60,
                    ];

                    AgentConfiguration::create([
                        'agent_id' => $agent->id,
                        'version' => 1,
                        'heartbeat_interval' => $heartbeatInterval,
                        'metrics_interval' => 5,
                        'port_scan_interval' => 60,
                        'service_scan_interval' => 60,
                        'process_scan_interval' => 60,
                        'update_channel' => 'stable',
                        'auto_update' => true,
                        'configuration_json' => $configJson,
                    ]);
                }
            }

            // Update installation record
            AgentInstallation::where('server_id', $server->id)
                ->where('status', 'started')
                ->latest()
                ->first()
                ?->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);

            // Log activity
            Activity::create([
                'server_id' => $server->id,
                'agent_id' => $agent->id,
                'type' => 'registration_completed',
                'description' => 'Agent registration completed successfully.',
            ]);

            \App\Models\CustomActivityLog::create([
                'type'         => 'agent',
                'logable_type' => get_class($server),
                'logable_id'   => $server->id,
                'user_id'      => null,
                'user'         => 'System',
                'action'       => 'Agent Installed',
                'details'      => json_encode([
                    'message'       => "Agent installed successfully on server: {$server->name}",
                    'server_name'   => $server->name,
                    'agent_version' => $metadata['agent_version'] ?? '1.0',
                ]),
            ]);

            // Broadcast event
            event(new RegistrationCompleted($server->uuid, $agent->id));
            try {
                \App\Events\ServerStatusUpdated::dispatch($server->uuid, \App\Enums\ServerStatus::WaitingForFirstHeartbeat->value, $server->name);
            } catch (\Throwable $e) {}

            return [
                'registered'    => true,
                'agent_id'      => $agent->id,
                'server_uuid'   => $server->uuid,
            ];
        });
    }
}