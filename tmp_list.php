<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use App\Models\ActionItem;

$items = ActionItem::where('server_id', 34)->where('action_type', 'like', 'alert_%')->get();
foreach ($items as $it) {
    $st = is_object($it->status) ? $it->status->value : $it->status;
    echo $it->action_type." $st assigned:".($it->assigned_to ?? 'null').PHP_EOL;
}
