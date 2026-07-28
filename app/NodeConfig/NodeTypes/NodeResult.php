<?php

namespace App\NodeConfig\NodeTypes;

class NodeResult
{
    public function __construct(
        public readonly mixed $value,
        public readonly bool $shouldPropagate = true,
        public readonly ?NodeTimer $timer = null,
        public readonly array $state = [],
        public readonly array $outputs = [],
        public readonly bool $cancelTimers = false,
    ) {}

    public static function propagate(mixed $value, array $state = []): self
    {
        return new self($value, true, null, $state);
    }

    public static function noPropagate(?NodeTimer $timer = null, array $state = []): self
    {
        return new self(null, false, $timer, $state);
    }

    public static function withTimer(mixed $value, ?NodeTimer $timer, array $state = []): self
    {
        return new self($value, true, $timer, $state);
    }

    public static function multiOutput(array $outputs, array $state = []): self
    {
        return new self(null, false, null, $state, $outputs);
    }

    public static function cancelTimers(array $state = []): self
    {
        return new self(null, false, null, $state, [], true);
    }
}
