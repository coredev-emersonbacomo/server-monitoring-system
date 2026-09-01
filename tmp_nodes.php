<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use App\Models\Server;
use App\NodeConfig\Models\NodeConfig;

$s = Server::where('name', 'funk-prod')->first();
$c = NodeConfig::resolveForServer($s->uuid);
$data = $c->getParsedConfig();
foreach ($data['nodes'] as $n) {
    echo $n['id'].' | '.$n['type'].' | '.json_encode($n['settings'] ?? []).PHP_EOL;
}
echo "--- branches ---\n";
print_r($data['branches'] ?? []);
