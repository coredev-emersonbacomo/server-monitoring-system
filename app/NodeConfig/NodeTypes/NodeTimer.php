<?php

namespace App\NodeConfig\NodeTypes;

class NodeTimer
{
    public function __construct(
        public readonly int $delayMs,
        public readonly array $context = [],
    ) {}
}
