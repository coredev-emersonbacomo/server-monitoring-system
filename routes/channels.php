<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('dashboard', fn ($user) => true);

Broadcast::channel('server.{serverId}', fn ($user, $serverId) => true);
