<?php

namespace App\NodeConfig\Services;

use App\NodeConfig\Jobs\SendNotification;

class NodeConfigNotificationService
{
    public function dispatchActions(array $actions): void
    {
        foreach ($actions as $action) {
            $this->dispatchAction($action);
        }
    }

    public function dispatchAction(array $action): void
    {
        $context = $action['upstream_context'] ?? [];
        $serverId = $context['server_id'] ?? null;

        SendNotification::dispatch($action, $serverId);
    }
}
