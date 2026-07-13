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

            ['id' => 'metric_cpu',       'type' => 'metric',      'position' => ['x' => 100, 'y' => 50],  'settings' => ['label' => 'CPU Usage',    'metric_type' => 'cpu_usage']],
            ['id' => 'metric_memory',    'type' => 'metric',      'position' => ['x' => -160, 'y' => 50],  'settings' => ['label' => 'Memory Usage', 'metric_type' => 'memory_usage']],
            ['id' => 'metric_disk',      'type' => 'metric',      'position' => ['x' => -160, 'y' => 215], 'settings' => ['label' => 'Disk Usage',   'metric_type' => 'disk_usage']],
            ['id' => 'metric_network',   'type' => 'metric',      'position' => ['x' => 100, 'y' => 215],  'settings' => ['label' => 'Network Usage','metric_type' => 'network_usage']],

            ['id' => 'compare_85',       'type' => 'condition',   'position' => ['x' => 350, 'y' => 130.28], 'settings' => ['label' => '>= 85%', 'operator' => 'greater_than', 'threshold' => 85, 'min' => 0, 'max' => 0]],

            ['id' => 'sustained_10',     'type' => 'sustained',   'position' => ['x' => 620, 'y' => 33.07],  'settings' => ['label' => 'Sustained 10m', 'duration' => '00:00:00:10:00']],
            ['id' => 'sustained_20',     'type' => 'sustained',   'position' => ['x' => 620, 'y' => 177.03], 'settings' => ['label' => 'Sustained 20m', 'duration' => '00:00:00:20:00']],
            ['id' => 'sustained_30',     'type' => 'sustained',   'position' => ['x' => 620, 'y' => 321.28], 'settings' => ['label' => 'Sustained 30m', 'duration' => '00:00:00:30:00']],

            ['id' => 'repeat_10',        'type' => 'repeat',      'position' => ['x' => 930, 'y' => 382.16], 'settings' => ['label' => 'Repeat 10m', 'interval' => '00:00:00:10:00']],

            ['id' => 'email_10',         'type' => 'notification','position' => ['x' => 930, 'y' => -5.14],  'settings' => ['label' => 'Email 10m',  'channel' => 'email',   'subject' => '[{server.client.name}] {server.name} - {metricName} Alert (10m)',  'message' => '[{server.client.name}] {server.name}\'s {metricName} has been above 85% for {sustainValue}!']],
            ['id' => 'email_20',         'type' => 'notification','position' => ['x' => 930, 'y' => 189.66], 'settings' => ['label' => 'Email 20m',  'channel' => 'email',   'subject' => '[{server.client.name}] {server.name} - {metricName} Alert (20m)',  'message' => '[{server.client.name}] {server.name}\'s {metricName} has been above 85% for {sustainValue}!']],
            ['id' => 'discord_30',       'type' => 'notification','position' => ['x' => 1235, 'y' => 301.80], 'settings' => ['label' => 'Discord 30m','channel' => 'discord', 'subject' => ':rotating_light: [{server.client.name}] {server.name} - {metricName} Alert (30m)', 'message' => ':rotating_light: [{server.client.name}] {server.name}\'s {metricName} has been above 85% for {sustainValue}! Repeating every 10m.']],

            // ── Bottom section: Server Status Offline ────────────────────

            ['id' => 'metric_status',    'type' => 'metric',      'position' => ['x' => 0, 'y' => 800.52],   'settings' => ['label' => 'Server Status', 'metric_type' => 'server_status']],

            ['id' => 'compare_offline',  'type' => 'condition',   'position' => ['x' => 250, 'y' => 759.52], 'settings' => ['label' => '== Offline', 'operator' => 'equal', 'threshold' => 0, 'min' => 0, 'max' => 0]],

            ['id' => 'sustained_10s',    'type' => 'sustained',   'position' => ['x' => 500, 'y' => 759.19], 'settings' => ['label' => 'Sustained 10m', 'duration' => '00:00:00:10:00']],
            ['id' => 'sustained_20s',    'type' => 'sustained',   'position' => ['x' => 500, 'y' => 903.44], 'settings' => ['label' => 'Sustained 20m', 'duration' => '00:00:00:20:00']],

            ['id' => 'repeat_10s',       'type' => 'repeat',      'position' => ['x' => 800, 'y' => 901.84], 'settings' => ['label' => 'Repeat 10m', 'interval' => '00:00:00:10:00']],

            ['id' => 'email_10s',        'type' => 'notification','position' => ['x' => 800, 'y' => 713.11], 'settings' => ['label' => 'Email 10m',  'channel' => 'email',   'subject' => '[{server.client.name}] {server.name} - Offline Alert (10m)',  'message' => '[{server.client.name}] {server.name} has been offline for {sustainValue}!']],
            ['id' => 'discord_20s',      'type' => 'notification','position' => ['x' => 1100, 'y' => 825.83], 'settings' => ['label' => 'Discord 20m', 'channel' => 'discord', 'subject' => ':rotating_light: [{server.client.name}] {server.name} - Offline Alert (20m)',  'message' => ':rotating_light: [{server.client.name}] {server.name} has been offline for {sustainValue}! Repeating every 10m.']],
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

            // Sustained → Notifications / Repeat
            ['id' => 'e_s10_email10',   'source' => 'sustained_10',   'target' => 'email_10',     'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_s20_email20',   'source' => 'sustained_20',   'target' => 'email_20',     'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_s30_repeat',    'source' => 'sustained_30',   'target' => 'repeat_10',    'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_repeat_discord', 'source' => 'repeat_10',     'target' => 'discord_30',   'sourceHandle' => 'output', 'targetHandle' => 'input'],

            // Server Status → Compare
            ['id' => 'e_status_off',    'source' => 'metric_status',  'target' => 'compare_offline', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],

            // Compare Offline → Sustained
            ['id' => 'e_off_s10',       'source' => 'compare_offline','target' => 'sustained_10s', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_off_s20',       'source' => 'compare_offline','target' => 'sustained_20s', 'sourceHandle' => 'output', 'targetHandle' => 'input'],

            // Sustained Offline → Notifications / Repeat
            ['id' => 'e_s10s_email',    'source' => 'sustained_10s',  'target' => 'email_10s',    'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_s20s_repeat',   'source' => 'sustained_20s',  'target' => 'repeat_10s',   'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_repeat_disc',   'source' => 'repeat_10s',     'target' => 'discord_20s',  'sourceHandle' => 'output', 'targetHandle' => 'input'],
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
