<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$clients = App\Models\Client::factory(10)->create();
foreach ($clients as $client) {
    App\Models\Server::factory(3)->create([
        'client_id' => $client->id,
        'status' => 'pending_installation',
    ]);
}

echo "Created {$clients->count()} clients with 3 servers each.\n";
