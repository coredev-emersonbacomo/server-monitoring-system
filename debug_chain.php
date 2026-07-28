<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\NodeConfig\Models\NodeConfig;

$cfg = NodeConfig::find(1);
foreach ($cfg->config['nodes'] ?? [] as $n) {
    if (str_contains($n['id'], 'sustained')) {
        echo "Node: {$n['id']} settings: " . json_encode($n['settings'] ?? []) . "\n";
    }
}
