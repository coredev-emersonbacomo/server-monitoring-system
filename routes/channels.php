<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('dashboard', fn ($user) => true, ['guards' => ['jwt']]);

// Private server events go to any authenticated dashboard user, mirroring the
// read API: /v1/servers (list, showWithStats) returns every server to any JWT
// user — "assigned" (sec_op_clients) is only a sort/marker, not an authz gate.
// The old sec_op_clients closure 403'd realtime for every client-owned server
// the user hasn't been explicitly linked to, even though the same details are
// readable over HTTP.
Broadcast::channel('server.{serverUuid}', fn ($user) => (bool) $user, ['guards' => ['jwt']]);

// Agent control channel — authenticated via agent identity token or authorized dashboard user.
Broadcast::channel('agent.{serverUuid}', fn ($user) => (bool) $user, ['guards' => ['jwt']]);

Broadcast::channel('system-telemetry', fn ($user) => true, ['guards' => ['jwt']]);
