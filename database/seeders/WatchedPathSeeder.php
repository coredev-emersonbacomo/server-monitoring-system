<?php

namespace Database\Seeders;

use App\Models\WatchedPath;
use Illuminate\Database\Seeder;

class WatchedPathSeeder extends Seeder
{
    public function run(): void
    {
        $isWindows = PHP_OS_FAMILY === 'Windows';
        $sep = $isWindows ? '\\' : '/';

        // Agent-scoped default: always monitor the agent's own state dir so
        // tampering with its state/config/identity/update files is audited. The
        // agent excludes its own high-frequency files (logs/queue) from this watch.
        $agentDir = $isWindows ? 'C:\\ProgramData\\MonitorAgent' : '/var/lib/monitor-agent';
        WatchedPath::updateOrInsert(
            ['path' => $agentDir, 'scope' => 'agent', 'server_id' => null],
            [
                'enabled' => true,
                'recursive' => true,
                'exclude_patterns' => json_encode(['*.log', '*.tmp']),
                'description' => 'MonitorAgent state/config/identity/update files',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Audit the operator's common working directories so file activity there
        // is captured. Paths are resolved from the current user profile at seed
        // time (idempotent via the natural key) and are OS-specific. High-churn
        // directories/files (logs, vendored deps, VCS metadata) are excluded so
        // the feed stays meaningful.
        $profile = $isWindows
            ? (getenv('USERPROFILE') ?: 'C:\\Users\\User')
            : (getenv('HOME') ?: '/home/user');
        $userPaths = [
            $profile.$sep.'Herd' => 'Herd projects (local sites)',
            $profile.$sep.'Downloads' => 'User Downloads folder',
            $profile.$sep.'Documents' => 'User Documents folder',
            $profile.$sep.'Desktop' => 'User Desktop folder',
        ];
        $userExcludes = ['*.log', 'node_modules', '.git', '*.tmp', 'vendor'];
        foreach ($userPaths as $path => $description) {
            WatchedPath::updateOrInsert(
                ['path' => $path, 'scope' => 'agent', 'server_id' => null],
                [
                    'enabled' => true,
                    'recursive' => true,
                    'exclude_patterns' => json_encode($userExcludes),
                    'description' => $description,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
