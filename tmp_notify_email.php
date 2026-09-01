<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use App\Models\ActionItem;
use App\Models\Server;
use App\NodeConfig\Jobs\SendNotification;
use App\Services\NotificationService;

$s = Server::where('name', 'funk-prod')->with('client.secopclients')->first();
echo 'secops '.count($s->client->secopclients)."\n";
foreach ($s->client->secopclients as $u) {
    echo $u->id.' '.$u->email."\n";
}
$action = ['node_id' => 'email_20', 'settings' => ['channel' => 'email', 'severity' => 'warning', 'subject' => 'test', 'message' => 'disk warn'], 'upstream_context' => ['metric_name' => 'Disk Usage', 'sustain_value' => '20s', 'threshold' => 85]];
$job = new SendNotification($action, $s->id);
$job->handle(app(NotificationService::class));
$items = ActionItem::where('server_id', $s->id)->where('action_type', 'like', 'alert_%')->get();
echo 'alert items '.count($items)."\n";
foreach ($items as $it) {
    $st = is_object($it->status) ? $it->status->value : $it->status;
    echo $it->action_type." $st assigned:".($it->assigned_to ?? 'null').' msg:'.$it->message.PHP_EOL;
}
