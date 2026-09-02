<?php

use App\Models\Server;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('dashboard', fn ($user) => true, ['guards' => ['jwt']]);

Broadcast::channel('server.{serverUuid}', function ($user, $serverUuid) {
    return Server::where('uuid', $serverUuid)
        ->where(function ($query) use ($user) {
            $query->whereNull('client_id')
                ->orWhereHas('client.secopclients', fn ($q) => $q->where('users.id', $user->id));
        })
        ->exists();
}, ['guards' => ['jwt']]);

// Agent control channel — authenticated via agent identity token or authorized dashboard user.
Broadcast::channel('agent.{serverUuid}', function ($user, $serverUuid) {
    return Server::where('uuid', $serverUuid)
        ->where(function ($query) use ($user) {
            $query->whereNull('client_id')
                ->orWhereHas('client.secopclients', fn ($q) => $q->where('users.id', $user->id));
        })
        ->exists();
}, ['guards' => ['jwt']]);

Broadcast::channel('system-telemetry', fn ($user) => true, ['guards' => ['jwt']]);
