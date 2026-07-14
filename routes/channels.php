<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Http\Request;
use App\Models\AgentIdentity;
use App\Models\Server;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('dashboard', fn ($user) => true, ['guards' => ['jwt']]);

Broadcast::channel('server.{serverUuid}', fn ($user, $serverUuid) => true, ['guards' => ['jwt']]);

// Agent control channel — authenticated via agent identity token (not a user session).
Broadcast::channel('agent.{serverUuid}', function ($user, $serverUuid) {
    // Allow authenticated dashboard users to listen too (for future use)
    return true;
}, ['guards' => ['jwt']]);
