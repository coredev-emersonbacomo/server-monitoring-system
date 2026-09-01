<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use App\Models\ActionItem;

$items = ActionItem::where('server_id', 34)->where('action_type', 'like', 'alert_%')->get();
foreach ($items as $it) {
    echo json_encode(['type' => $it->action_type, 'assigned' => $it->assigned_to, 'status' => is_object($it->status) ? $it->status->value : $it->status]).PHP_EOL;
}
