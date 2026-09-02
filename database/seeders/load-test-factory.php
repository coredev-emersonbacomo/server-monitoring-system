<?php

//
// Initialize test data
User::factory(25)->create();
Client::factory(10)->create();
Server::factory(100)->create();

// Assign seeded user as secop to all clients
$user = User::where('username', 'user')->first();
if ($user) {
    foreach (Client::all() as $c) {
        if (! $c->secopclients()->where('user_id', $user->id)->exists()) {
            $c->secopclients()->attach($user->id, [
                'uuid' => (string) Str::uuid7(),
                'record_status' => 'active',
            ]);
        }
    }
    echo 'User secop assigned to all clients.'.PHP_EOL;
} else {
    echo 'User not found.'.PHP_EOL;
}
