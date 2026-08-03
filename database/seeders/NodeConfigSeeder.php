<?php

namespace Database\Seeders;

use App\NodeConfig\Cache\NodeConfigCache;
use App\NodeConfig\Models\NodeConfig;
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

            ['id' => 'compare_85',       'type' => 'condition',   'position' => ['x' => 340,  'y' => 140], 'settings' => ['label' => '>= 85%', 'operator' => 'greater_than_equal', 'threshold' => 85, 'min' => 0, 'max' => 0]],

            ['id' => 'sustained_10',     'type' => 'sustained',   'position' => ['x' => 600,  'y' => -180], 'settings' => ['label' => 'Sustained 10s', 'duration' => '10000']],
            ['id' => 'sustained_20',     'type' => 'sustained',   'position' => ['x' => 600,  'y' => 140], 'settings' => ['label' => 'Sustained 20s', 'duration' => '20000']],
            ['id' => 'sustained_30',     'type' => 'sustained',   'position' => ['x' => 600,  'y' => 460], 'settings' => ['label' => 'Sustained 30s + Repeat', 'duration' => '30000', 'repeat_interval' => '10000', 'repeat_max_repeats' => -1]],
            ['id' => 'email_10',         'type' => 'notification','position' => ['x' => 860,  'y' => -180], 'settings' => ['label' => 'Email 10s',  'channel' => 'email',   'subject' => '[{runtime.severity}] [{server.client.name}] {server.name} - {runtime.metricName} Alert (10s)', 'severity' => 'notice', 'message' => 'Server Alert ({runtime.severity})
[{server.client.name}] {server.name}\'s {runtime.metricName} has been above 85% for {runtime.sustainValue}!
Event: <t:{runtime.eventTimestampUnix}:f>
First Trigger: <t:{runtime.firstTriggerTimestampUnix}:f>
<email-button url="{server.url}">View Server Details</email-button>']],
            ['id' => 'email_20',         'type' => 'notification','position' => ['x' => 860,  'y' => 140], 'settings' => ['label' => 'Email 20s',  'channel' => 'email',   'subject' => '[{runtime.severity}] [{server.client.name}] {server.name} - {runtime.metricName} Alert (20s)', 'severity' => 'warning', 'message' => 'Server Alert ({runtime.severity})
[{server.client.name}] {server.name}\'s {runtime.metricName} has been above 85% for {runtime.sustainValue}!
Event: <t:{runtime.eventTimestampUnix}:f>
First Trigger: <t:{runtime.firstTriggerTimestampUnix}:f>
<email-button url="{server.url}">View Server Details</email-button>']],
            ['id' => 'discord_30',       'type' => 'notification','position' => ['x' => 860,  'y' => 460], 'settings' => ['label' => 'Discord 30s','channel' => 'discord', 'bot_token' => env('DISCORD_BOT_TOKEN'), 'channel_id' => env('DISCORD_CHANNEL_ID'), 'role_id' => env('DISCORD_ROLE_ID'), 'severity' => 'critical', 'message' => '{runtime.discordRoleCallout} [{server.client.name}] {server.name}\'s {runtime.metricName} ({runtime.severity})
<discord-embed>
<discord-embed-title>:rotating_light: Server Alert ({runtime.severity})</discord-embed-title>

<b>[{server.client.name}] {server.name}\'s {runtime.metricName}</b> has been above 85% for {runtime.sustainValue}!

Event: <t:{runtime.eventTimestampUnix}:f>
First Trigger: <t:{runtime.firstTriggerTimestampUnix}:f>
<if-repeat>
<discord-footer>Server Monitoring System · repeat: {runtime.repeat.countOfMessage} of {runtime.repeat.max} ({runtime.repeat.interval})</discord-footer>
</if-repeat>
</discord-embed>
<discord-button url="{server.url}">View Server Details</discord-button>']],

            // ── Bottom section: Server Status Offline ────────────────────

            ['id' => 'metric_status',    'type' => 'metric',      'position' => ['x' => -300, 'y' => 580], 'settings' => ['label' => 'Server Status', 'metric_type' => 'server_status']],

            ['id' => 'email_offline',    'type' => 'notification','position' => ['x' => -60,  'y' => 430], 'settings' => ['label' => 'Email Offline',  'channel' => 'email',   'subject' => '[{runtime.severity}] [{server.client.name}] {server.name} - Offline Alert', 'severity' => 'warning', 'message' => 'Server Alert ({runtime.severity})
[{server.client.name}] {server.name} has been offline for {runtime.offlineDuration}
Event: <t:{runtime.eventTimestampUnix}:f>
First Trigger: <t:{runtime.firstTriggerTimestampUnix}:f>
<email-button url="{server.url}">View Server Details</email-button>']],

            ['id' => 'check_after_10m',  'type' => 'check_after', 'position' => ['x' => -60,  'y' => 750], 'settings' => ['label' => 'Check After 10s', 'duration' => '10000', 'repeat_interval' => '10000', 'repeat_max_repeats' => -1]],
            ['id' => 'discord_offline',  'type' => 'notification','position' => ['x' => 200,  'y' => 670], 'settings' => ['label' => 'Discord Offline', 'channel' => 'discord', 'bot_token' => env('DISCORD_BOT_TOKEN'), 'channel_id' => env('DISCORD_CHANNEL_ID'), 'role_id' => env('DISCORD_ROLE_ID'), 'severity' => 'critical', 'message' => '{runtime.discordRoleCallout} [{server.client.name}] {server.name} — ({runtime.severity})
<discord-embed>
<discord-embed-title>:rotating_light: Server Alert ({runtime.severity})</discord-embed-title>

<b>[{server.client.name}] {server.name}</b> has been offline for {runtime.offlineDuration}

Event: <t:{runtime.eventTimestampUnix}:f>
First Trigger: <t:{runtime.firstTriggerTimestampUnix}:f>
<if-repeat>
<discord-footer>Server Monitoring System · repeat: {runtime.repeat.countOfMessage} of {runtime.repeat.max} ({runtime.repeat.interval})</discord-footer>
</if-repeat>
</discord-embed>
<discord-button url="{server.url}">View Server Details</discord-button>']],
        ];

        $edges = [
            // Metrics → Compare
            ['id' => 'e_cpu_85',        'source' => 'metric_cpu',     'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
            ['id' => 'e_mem_85',        'source' => 'metric_memory',  'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
            ['id' => 'e_disk_85',       'source' => 'metric_disk',    'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],
            ['id' => 'e_net_85',        'source' => 'metric_network', 'target' => 'compare_85', 'sourceHandle' => 'output', 'targetHandle' => 'input-a'],

            // Compare → Sustained Stack (Sequential chaining)
            ['id' => 'e_85_s10',        'source' => 'compare_85',     'target' => 'sustained_10', 'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_s10_s20',       'source' => 'sustained_10',   'target' => 'sustained_20', 'sourceHandle' => 'chain-out', 'targetHandle' => 'chain-in'],
            ['id' => 'e_s20_s30',       'source' => 'sustained_20',   'target' => 'sustained_30', 'sourceHandle' => 'chain-out', 'targetHandle' => 'chain-in'],

            // Sustained → Notifications
            ['id' => 'e_s10_email10',   'source' => 'sustained_10',   'target' => 'email_10',     'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_s20_email20',   'source' => 'sustained_20',   'target' => 'email_20',     'sourceHandle' => 'output', 'targetHandle' => 'input'],
            ['id' => 'e_s30_discord',   'source' => 'sustained_30',   'target' => 'discord_30',   'sourceHandle' => 'output', 'targetHandle' => 'input'],

            // Server Status Offline → Immediate Email
            ['id' => 'e_off_email',     'source' => 'metric_status',  'target' => 'email_offline', 'sourceHandle' => 'offline', 'targetHandle' => 'input'],

            // Server Status Offline → Check After 10m → Discord
            ['id' => 'e_off_check',     'source' => 'metric_status',  'target' => 'check_after_10m','sourceHandle' => 'offline', 'targetHandle' => 'input'],
            ['id' => 'e_check_discord',  'source' => 'check_after_10m','target' => 'discord_offline','sourceHandle' => 'output', 'targetHandle' => 'input'],
        ];

        $config = ['nodes' => $nodes, 'edges' => $edges];

        // compiled_config is auto-generated by NodeConfig::compileAndStore() on save
        NodeConfig::updateOrCreate(
            ['slug' => 'alerts'],
            [
                'name'    => 'Default Alerts',
                'config'  => $config,
                'enabled' => true,
            ],
        );

        NodeConfigCache::warm();
    }
}
