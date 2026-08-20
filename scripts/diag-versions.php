<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

use App\Models\AgentVersion;
use Illuminate\Contracts\Console\Kernel;

foreach (AgentVersion::orderBy('id')->get() as $v) {
    echo "id={$v->id} version={$v->version} created_at={$v->created_at}\n";
}
