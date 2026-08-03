<?php
//
// Initialize test data
User::factory(25)->create();
Client::factory(10)->create();
Server::factory(100)->create();

// Assign admin as secop to all clients
$admin = User::where('username', 'admin')->first();
if ($admin) {
    foreach (Client::all() as $c) {
        if (!$c->secopclients()->where('user_id', $admin->id)->exists()) {
            $c->secopclients()->attach($admin->id, [
                'uuid' => (string) Str::uuid7(),
                'record_status' => 'active',
            ]);
        }
    }
    echo 'Admin secop assigned to all clients.' . PHP_EOL;
} else {
    echo 'Admin user not found.' . PHP_EOL;
}
