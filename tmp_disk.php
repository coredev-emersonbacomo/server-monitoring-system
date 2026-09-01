<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use App\Models\ActionItem;
use App\Models\Server;
use App\Models\ServerUpdate;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Models\NodeConfig;

$s = Server::where('name', 'funk-prod')->first();
$upd = ServerUpdate::where('server_id', $s->id)->orderByDesc('created_at')->first();
echo 'latest disk '.$upd->storage.' cpu '.$upd->cpu_usage.' mem '.$upd->memory_usage.PHP_EOL;
echo 'server id '.$s->id.' uuid '.$s->uuid.PHP_EOL;
$c = NodeConfig::resolveForServer($s->uuid);
if (! $c) {
    echo "no config\n";
    exit;
}
echo 'config id '.$c->id.PHP_EOL;
// check metric node for disk
$registry = app(NodeRegistry::class);
$engine = new NodeConfigEngine($registry);
$source = $engine->findMetricNode($c, 'disk_usage');
echo "source disk node $source\n";
$extra = ['server_id' => $s->id, 'server_name' => $s->name, 'client_name' => $s->client->name ?? '', 'metric_type' => 'disk_usage'];
$result = $engine->trigger($c, $source, 93, $extra, $s->id);
echo 'trigger success '.($result['success'] ? 'yes' : 'no').' timers '.count($result['timers']).' actions '.count($result['actions'])."\n";
print_r($result);
// also check actions board before/after
$items = ActionItem::where('server_id', $s->id)->where('action_type', 'like', 'alert_%')->get();
echo 'existing alert items '.count($items)."\n";
foreach ($items as $it) {
    $st = is_object($it->status) ? $it->status->value : $it->status;
    echo $it->action_type." $st ".$it->message.PHP_EOL;
}
