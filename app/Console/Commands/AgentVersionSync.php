<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AgentVersion;
use App\Models\Agent;
use App\Models\Setting;

class AgentVersionSync extends Command
{
    protected $signature = 'agent:version-sync
                            {--force : Force a version bump even if hash unchanged}';

    protected $description = 'Check if the compiled agent binary has changed and auto-bump the AgentVersion record, then broadcast the update to connected agents for immediate pickup.';

    public function handle(): int
    {
        $manifestPath = storage_path('app/agent_build_manifest.json');

        $windowsBinary = public_path('MonitorAgent.exe');
        $linuxBinary   = public_path('agent');

        if (!file_exists($windowsBinary) && !file_exists($linuxBinary)) {
            $this->error('No compiled agent binaries found in public/. Run npm run compileagent first.');
            return self::FAILURE;
        }

        // Compute current hashes
        $current = [];
        if (file_exists($windowsBinary)) {
            $current['windows'] = [
                'sha256' => hash_file('sha256', $windowsBinary),
                'size'   => filesize($windowsBinary),
                'mtime'  => filemtime($windowsBinary),
            ];
        }
        if (file_exists($linuxBinary)) {
            $current['linux'] = [
                'sha256' => hash_file('sha256', $linuxBinary),
                'size'   => filesize($linuxBinary),
                'mtime'  => filemtime($linuxBinary),
            ];
        }

        // Load previous manifest
        $previous = [];
        if (file_exists($manifestPath)) {
            $previous = json_decode(file_get_contents($manifestPath), true) ?? [];
        }

        $prevWindowsHash = $previous['windows']['sha256'] ?? null;
        $prevLinuxHash   = $previous['linux']['sha256']   ?? null;
        $curWindowsHash  = $current['windows']['sha256']  ?? null;
        $curLinuxHash    = $current['linux']['sha256']    ?? null;

        $windowsChanged = $curWindowsHash && $curWindowsHash !== $prevWindowsHash;
        $linuxChanged   = $curLinuxHash   && $curLinuxHash   !== $prevLinuxHash;
        $anyChanged     = $windowsChanged || $linuxChanged;

        if (!$anyChanged && !$this->option('force')) {
            // Resetdb seeds an AgentVersion row, so the table may disagree
            // with the manifest even when binaries are unchanged — the row must
            // still be recreated so bootstrap serves the current version.
            $manifestVersion = $previous['version'] ?? null;
            $latestVersion   = AgentVersion::latest('id')->value('version');
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
                ? $parts[0] . '.' . ((int) $parts[1] + 1)
                : '2.' . ($latest->id + 1);
        } else {
            $nextVersion = '2.1';
        }

        // Create AgentVersion record
        AgentVersion::create([
            'version'    => $nextVersion,
            'binary_url' => url('/MonitorAgent.exe'),
            'description' => sprintf(
                'Agent binary auto-updated to %s (windows: %s, linux: %s)',
                $nextVersion,
                substr($curWindowsHash ?? 'n/a', 0, 12) . '...',
                substr($curLinuxHash   ?? 'n/a', 0, 12) . '...'
            ),
        ]);

        $this->info("✓ Created AgentVersion: {$nextVersion}");

        // Broadcast binary update to connected agents for immediate pickup
        // (heartbeat pending_update remains the fallback trigger).
        $heartbeatInterval = (int) (Setting::get('heartbeat_interval') ?: 5);
        $agents = Agent::where('status', 'active')->with('server')->get();
        $dispatched = 0;

        foreach ($agents as $agent) {
            if ($agent->server) {
                // Detect platform from agent's server OS to send the right binary URL
                $os = strtolower($agent->server->operating_system ?? '');
                $agentBinaryUrl = str_contains($os, 'windows')
                    ? url('/MonitorAgent.exe')
                    : url('/agent');

                event(new \App\Events\AgentConfigUpdated(
                    $agent->server->uuid,
                    $heartbeatInterval,
                    'binary_update',
                    $nextVersion,
                    $agentBinaryUrl
                ));
                $dispatched++;
            }
        }

        if ($dispatched > 0) {
            $this->info("✓ Broadcast binary_update v{$nextVersion} to {$dispatched} agent(s) via WebSocket.");
        }

        // Persist updated manifest
        $current['version']    = $nextVersion;
        $current['updated_at'] = now()->toIso8601String();
        file_put_contents($manifestPath, json_encode($current, JSON_PRETTY_PRINT));
        $this->info("✓ Manifest saved to storage/app/agent_build_manifest.json");

        return self::SUCCESS;
    }
}
