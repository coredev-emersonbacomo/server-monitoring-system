<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

echo 'servers='.DB::table('servers')->count()."\n";
echo 'agents='.DB::table('agents')->count()."\n";
echo 'processes='.DB::table('processes')->count()."\n";
echo 'ports='.DB::table('ports')->count()."\n";
echo 'users='.DB::table('users')->count()."\n";
echo 'telescope='.DB::table('telescope_entries')->count()."\n";
$t = DB::table('telescope_entries')->oldest('sequence')->first();
echo 'earliest telescope: '.($t ? $t->created_at : 'none')."\n";
$t2 = DB::table('telescope_entries')->latest('sequence')->first();
echo 'latest telescope: '.($t2 ? $t2->created_at : 'none')."\n";
