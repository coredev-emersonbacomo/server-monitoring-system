<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

use App\Models\Agent;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo 'agent version='.Agent::first()->version.' last_seen='.Agent::first()->last_seen_at."\n\n";

echo 'processes table cols: '.implode(', ', array_column(Schema::getColumns('processes'), 'name'))."\n";
echo 'ports table cols: '.implode(', ', array_column(Schema::getColumns('ports'), 'name'))."\n\n";

echo 'processes='.DB::table('processes')->count()."\n";
foreach (DB::table('processes')->orderByDesc('id')->limit(30)->get() as $p) {
    echo "  {$p->name} pid={$p->pid} cpu={$p->cpu} mem={$p->memory} last_seen={$p->last_seen}\n";
}
echo "\nports=".DB::table('ports')->count()."\n";
foreach (DB::table('ports')->limit(15)->get() as $p) {
    echo "  port={$p->port} proto={$p->protocol} process={$p->process} state={$p->state} last_seen={$p->last_seen}\n";
}
