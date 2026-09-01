<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use App\Models\Agent;
use App\Models\Heartbeat;
use App\Models\MetricSample;

$agent = Agent::find(13);
$hb = Heartbeat::where('agent_id', 13)->orderByDesc('received_at')->first();
echo 'hb '.($hb ? $hb->received_at.' id '.$hb->id : 'none').PHP_EOL;
$sample = MetricSample::whereHas('batch', fn ($q) => $q->where('agent_id', 13))->orderByDesc('recorded_at')->first();
echo 'sample '.($sample ? $sample->recorded_at.' '.$sample->metric_type.' '.$sample->value : 'none').PHP_EOL;
