<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use Illuminate\Support\Facades\DB;

$rows = DB::table('heartbeats')->orderByDesc('id')->limit(5)->get();
foreach ($rows as $r) {
    echo "id {$r->id} agent {$r->agent_id} received {$r->received_at} created {$r->created_at}\n";
}
