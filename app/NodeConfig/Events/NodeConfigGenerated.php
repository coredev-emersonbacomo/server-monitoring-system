<?php

namespace App\NodeConfig\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NodeConfigGenerated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $configId,
        public readonly string $sourceNodeId,
        public readonly mixed $value,
        public readonly array $extraState = [],
    ) {}
}
