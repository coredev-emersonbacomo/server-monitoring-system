<?php

use App\Models\Client;
use App\Models\Server;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$clients = Client::factory(10)->create();
foreach ($clients as $client) {
    Server::factory(3)->create([
        'client_id' => $client->id,
        'status' => 'pending_installation',
    ]);
}

echo "Created {$clients->count()} clients with 3 servers each.\n";
