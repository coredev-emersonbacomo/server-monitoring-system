<?php

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
use App\Models\Agent;
use App\Models\Server;

foreach (Agent::all() as $a) {
    echo "id {$a->id} server_id {$a->server_id} status {$a->status} last_seen {$a->last_seen_at} inst {$a->installation_uuid}\n";
}
$s = Server::where('name', 'funk-prod')->first();
echo "server agent_id {$s->agent_id}\n";
$a = Agent::find($s->agent_id);
echo "agent for server: id {$a->id} status {$a->status} last_seen {$a->last_seen_at}\n";
