<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use Illuminate\Support\Facades\DB;

$rows = DB::table('metric_samples')->join('metric_batches', 'metric_samples.batch_id', '=', 'metric_batches.id')->where('metric_batches.agent_id', 13)->orderByDesc('metric_samples.recorded_at')->limit(5)->get();
foreach ($rows as $r) {
    echo "sample {$r->metric_type} {$r->metric_name} {$r->value} {$r->recorded_at} batch {$r->batch_id}\n";
}
