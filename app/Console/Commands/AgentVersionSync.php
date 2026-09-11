<?php

namespace App\Console\Commands;

use App\Events\AgentConfigUpdated;
use App\Models\Agent;
use App\Models\AgentVersion;
use App\Models\Setting;
use Illuminate\Console\Command;

class AgentVersionSync extends Command
{
    protected $signature = 'agent:version-sync
                            {--force : Force a version bump even if hash unchanged}';

    protected $description = 'Check if the compiled agent binary has changed and auto-bump the AgentVersion record, then broadcast the update to connected agents for immediate pickup.';

    public function handle(): int
    {
        $manifestPath = storage_path('app/agent_build_manifest.json');

        $windowsBinary = public_path('MonitorAgent.exe');
        $linuxBinary = public_path('agent');

        if (! file_exists($windowsBinary) && ! file_exists($linuxBinary)) {
            $this->error('No compiled agent binaries found in public/. Run npm run compileagent first.');

            return self::FAILURE;
        }

        // Compute current hashes
        $current = [];
        if (file_exists($windowsBinary)) {
            $current['windows'] = [
                'sha256' => hash_file('sha256', $windowsBinary),
                'size' => filesize($windowsBinary),
                'mtime' => filemtime($windowsBinary),
            ];
        }
        if (file_exists($linuxBinary)) {
            $current['linux'] = [
                'sha256' => hash_file('sha256', $linuxBinary),
                'size' => filesize($linuxBinary),
                'mtime' => filemtime($linuxBinary),
            ];
        }

        // Load previous manifest
        $previous = [];
        if (file_exists($manifestPath)) {
            $previous = json_decode(file_get_contents($manifestPath), true) ?? [];
        }

        $prevWindowsHash = $previous['windows']['sha256'] ?? null;
        $prevLinuxHash = $previous['linux']['sha256'] ?? null;
        $curWindowsHash = $current['windows']['sha256'] ?? null;
        $curLinuxHash = $current['linux']['sha256'] ?? null;

        $windowsChanged = $curWindowsHash && $curWindowsHash !== $prevWindowsHash;
        $linuxChanged = $curLinuxHash && $curLinuxHash !== $prevLinuxHash;
        $anyChanged = $windowsChanged || $linuxChanged;

        if (! $anyChanged && ! $this->option('force')) {
            // Resetdb seeds an AgentVersion row, so the table may disagree
            // with the manifest even when binaries are unchanged — the row must
            // still be recreated so bootstrap serves the current version.
            $manifestVersion = $previous['version'] ?? null;
            $latestVersion = AgentVersion::latest('id')->value('version');
            if ($latestVersion === $manifestVersion) {
                $this->info('✓ Agent binaries unchanged — no version bump needed.');
                $this->line("  Windows SHA256: {$curWindowsHash}");
                $this->line("  Linux   SHA256: {$curLinuxHash}");

                return self::SUCCESS;
            }
        }

        if ($this->option('force')) {
            $this->warn('--force flag set, bumping version regardless of hash.');
        } else {
            if ($windowsChanged) {
                $this->line("  Windows: <fg=yellow>{$prevWindowsHash}</> → <fg=green>{$curWindowsHash}</>");
            }
            if ($linuxChanged) {
                $this->line("  Linux:   <fg=yellow>{$prevLinuxHash}</> → <fg=green>{$curLinuxHash}</>");
            }
        }

        // Compute next version number
        $latest = AgentVersion::orderBy('id', 'desc')->first();
        if ($latest) {
            $parts = explode('.', $latest->version);
            $nextVersion = count($parts) === 2
                ? $parts[0].'.'.((int) $parts[1] + 1)
                : '2.'.($latest->id + 1);
        } else {
            $nextVersion = '2.1';
        }

        // Create AgentVersion record
        AgentVersion::create([
            'version' => $nextVersion,
            'binary_url' => rtrim(env('APP_URL') ?: url('/'), '/').'/MonitorAgent.exe',
            'description' => sprintf(
                'Agent binary auto-updated to %s (windows: %s, linux: %s)',
                $nextVersion,
                substr($curWindowsHash ?? 'n/a', 0, 12).'...',
                substr($curLinuxHash ?? 'n/a', 0, 12).'...'
            ),
        ]);

        $this->info("✓ Created AgentVersion: {$nextVersion}");

        // Broadcast binary update to connected agents for immediate pickup
        // (heartbeat pending_update remains the fallback trigger).
        // One dispatch per agent (not per server) — single-agent-per-computer
        // holds 2 servers on 1 agent, so counting servers as agents is wrong.
        $heartbeatInterval = (int) (Setting::get('heartbeat_interval') ?: 5);
        $agents = Agent::where('status', 'active')->with('monitoredServers')->get();
        $dispatchedAgents = 0;
        $dispatchedServers = 0;

        foreach ($agents as $agent) {
            $server = $agent->monitoredServers->first();
            if (! $server) {
                continue;
            }
            // Detect platform from the agent's first server OS to send the right binary URL
            // (all servers on one host share the OS).
            $os = strtolower($server->operating_system ?? '');
            $baseUrl = rtrim(env('APP_URL') ?: url('/'), '/');
            $agentBinaryUrl = str_contains($os, 'windows')
                ? $baseUrl.'/MonitorAgent.exe'
                : $baseUrl.'/agent';

            event(new AgentConfigUpdated(
                $server->uuid,
                $heartbeatInterval,
                'binary_update',
                $nextVersion,
                $agentBinaryUrl
            ));
            $dispatchedAgents++;
            $dispatchedServers += $agent->monitoredServers->count();
        }

        if ($dispatchedAgents > 0) {
            $this->info("✓ Broadcast binary_update v{$nextVersion} to {$dispatchedAgents} agent(s) ({$dispatchedServers} server(s)) via WebSocket.");
        }

        // Persist updated manifest
        $current['version'] = $nextVersion;
        $current['updated_at'] = now()->toIso8601String();
        file_put_contents($manifestPath, json_encode($current, JSON_PRETTY_PRINT));
        $this->info('✓ Manifest saved to storage/app/agent_build_manifest.json');

        return self::SUCCESS;
    }
}
