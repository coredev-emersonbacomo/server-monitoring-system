<?php

namespace Database\Seeders;

use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\Engine\NodeConfigCompiler;
use Illuminate\Database\Seeder;

class NodeConfigSeeder extends Seeder
{
    public function run(): void
    {
        $nodes = [
            // ── Top section: Metrics >= 85% ──────────────────────────────

            ['id' => 'metric_cpu',       'type' => 'metric',      'position' => ['x' => 100,  'y' => 60],  'settings' => ['label' => 'CPU Usage',    'metric_type' => 'cpu_usage']],
            ['id' => 'metric_memory',    'type' => 'metric',      'position' => ['x' => -120, 'y' => 60],  'settings' => ['label' => 'Memory Usage', 'metric_type' => 'memory_usage']],
            ['id' => 'metric_disk',      'type' => 'metric',      'position' => ['x' => -120, 'y' => 210], 'settings' => ['label' => 'Disk Usage',   'metric_type' => 'disk_usage']],
            ['id' => 'metric_network',   'type' => 'metric',      'position' => ['x' => 100,  'y' => 210], 'settings' => ['label' => 'Network Usage','metric_type' => 'network_usage']],

            ['id' => 'compare_85',       'type' => 'condition',   'position' => ['x' => 340,  'y' => 140], 'settings' => ['label' => '>= 85%', 'operator' => 'greater_than', 'threshold' => 85, 'min' => 0, 'max' => 0]],

            ['id' => 'sustained_10',     'type' => 'sustained',   'position' => ['x' => 600,  'y' => 60],  'settings' => ['label' => 'Sustained 10m', 'duration' => '00:00:00:10:00']],
            ['id' => 'sustained_20',     'type' => 'sustained',   'position' => ['x' => 600,  'y' => 210], 'settings' => ['label' => 'Sustained 20m', 'duration' => '00:00:00:20:00']],
            ['id' => 'sustained_30',     'type' => 'sustained',   'position' => ['x' => 600,  'y' => 360], 'settings' => ['label' => 'Sustained 30m', 'duration' => '00:00:00:30:00']],

            ['id' => 'email_10',         'type' => 'notification','position' => ['x' => 860,  'y' => 10],  'settings' => ['label' => 'Email 10m',  'channel' => 'email',   'subject' => '[{server.client.name}] {server.name} - {metricName} Alert (10m)',  'message' => '[{server.client.name}] {server.name}\'s {metricName} has been above 85% for {sustainValue}!']],
            ['id' => 'email_20',         'type' => 'notification','position' => ['x' => 860,  'y' => 210], 'settings' => ['label' => 'Email 20m',  'channel' => 'email',   'subject' => '[{server.client.name}] {server.name} - {metricName} Alert (20m)',  'message' => '[{server.client.name}] {server.name}\'s {metricName} has been above 85% for {sustainValue}!']],
            ['id' => 'discord_30',       'type' => 'notification','position' => ['x' => 860,  'y' => 410], 'settings' => ['label' => 'Discord 30m','channel' => 'discord', 'message' => ':rotating_light: [{server.client.name}] {server.name}\'s {metricName} has been above 85% for {sustainValue}! Repeating every 10m.']],
            ['id' => 'repeat_10',        'type' => 'repeat',      'position' => ['x' => 1120, 'y' => 410], 'settings' => ['label' => 'Repeat 10m', 'interval' => '00:00:00:10:00']],

            // ── Bottom section: Server Status Offline ────────────────────

            ['id' => 'metric_status',    'type' => 'metric',      'position' => ['x' => 100,  'y' => 640], 'settings' => ['label' => 'Server Status', 'metric_type' => 'server_status']],

            ['id' => 'email_offline',    'type' => 'notification','position' => ['x' => 340,  'y' => 640], 'settings' => ['label' => 'Email Offline',  'channel' => 'email',   'subject' => '[{server.client.name}] {server.name} - Offline Alert', 'message' => '[{server.client.name}] {server.name} is offline!']],

            ['id' => 'check_after_10m',  'type' => 'check_after', 'position' => ['x' => 340,  'y' => 840], 'settings' => ['label' => 'Check After 10m', 'duration' => '00:00:00:10:00']],
            ['id' => 'discord_offline',  'type' => 'notification','position' => ['x' => 600,  'y' => 840], 'settings' => ['label' => 'Discord Offline', 'channel' => 'discord', 'message' => ':rotating_light: [{server.client.name}] {server.name} is still offline! (for {runtime.offlineDuration})']],
            ['id' => 'repeat_5m',        'type' => 'repeat',      'position' => ['x' => 860,  'y' => 840], 'settings' => ['label' => 'Repeat 5m', 'interval' => '00:00:00:05:00']],
        ];

        $edges = [
            // Metrics → Compare
            ['id' => 'e_cpu_85',        'source' => 'metric_cpu',     'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
            ['id' => 'e_mem_85',        'source' => 'metric_memory',  'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
            ['id' => 'e_disk_85',       'source' => 'metric_disk',    'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
            ['id' => 'e_net_85',        'source' => 'metric_network', 'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],

            // Compare → Sustained
            ['id' => 'e_85_s10',        'source' => 'compare_85',     'target' => 'sustained_10', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_85_s20',        'source' => 'compare_85',     'target' => 'sustained_20', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_85_s30',        'source' => 'compare_85',     'target' => 'sustained_30', 'sourceHandle' => 'output', 'targetHandle' => 'input'],

            // Sustained → Notifications
            ['id' => 'e_s10_email10',   'source' => 'sustained_10',   'target' => 'email_10',     'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_s20_email20',   'source' => 'sustained_20',   'target' => 'email_20',     'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_s30_discord',   'source' => 'sustained_30',   'target' => 'discord_30',   'sourceHandle' => 'output', 'targetHandle' => 'input'],

            // Discord 30m → Repeat
            ['id' => 'e_discord_repeat_metrics', 'source' => 'discord_30', 'target' => 'repeat_10', 'sourceHandle' => 'out', 'targetHandle' => 'input'],

            // Server Status Offline → Immediate Email
            ['id' => 'e_off_email',     'source' => 'metric_status',  'target' => 'email_offline', 'sourceHandle' => 'offline', 'targetHandle' => 'input'],

            // Server Status Offline → Check After 10m → Discord → Repeat
            ['id' => 'e_off_check',     'source' => 'metric_status',  'target' => 'check_after_10m','sourceHandle' => 'offline', 'targetHandle' => 'input'],
            ['id' => 'e_check_discord',  'source' => 'check_after_10m','target' => 'discord_offline','sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_discord_repeat', 'source' => 'discord_offline','target' => 'repeat_5m',    'sourceHandle' => 'out',     'targetHandle' => 'input'],
        ];

        $config = ['nodes' => $nodes, 'edges' => $edges];

        $compiler = new NodeConfigCompiler();
        $compiled = $compiler->compile($config);

        NodeConfig::updateOrCreate(
            ['slug' => 'alerts'],
            [
                'name'            => 'Default Alerts',
                'config'          => $config,
                'compiled_config' => $compiled,
                'enabled'         => true,
            ],
        );
    }
}
