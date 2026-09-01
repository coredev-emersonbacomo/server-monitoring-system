<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use App\Models\ActionItem;
use App\Models\Server;
use App\NodeConfig\Jobs\SendNotification;
use App\Services\NotificationService;

$s = Server::where('name', 'funk-prod')->with('client.secopclients')->first();
echo 'MUTE '.env('MUTE_NOTIFICATION').PHP_EOL;
$action = ['node_id' => 'discord_30', 'settings' => ['channel' => 'discord', 'bot_token' => 'x', 'channel_id' => 'y', 'role_id' => '', 'severity' => 'critical', 'subject' => 'test', 'message' => 'disk {runtime.metricName} {runtime.sustainValue}'], 'upstream_context' => ['metric_name' => 'Disk Usage', 'sustain_value' => '30s', 'threshold' => 85]];
$job = new SendNotification($action, $s->id);
$job->handle(app(NotificationService::class));
$items = ActionItem::where('server_id', $s->id)->where('action_type', 'like', 'alert_%')->get();
echo 'alert items '.count($items)."\n";
foreach ($items as $it) {
    $st = is_object($it->status) ? $it->status->value : $it->status;
    echo $it->action_type." $st assigned:".($it->assigned_to ?? 'null').' msg:'.$it->message.PHP_EOL;
}
