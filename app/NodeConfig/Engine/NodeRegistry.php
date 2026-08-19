<?php

namespace App\NodeConfig\Engine;

use App\NodeConfig\NodeTypes\NodeType;

class NodeRegistry
{
    private array $types = [];

    public function register(NodeType $type): void
    {
        $this->types[$type->getType()] = $type;
    }

    public function get(string $type): ?NodeType
    {
        return $this->types[$type] ?? null;
    }

    public function all(): array
    {
        return $this->types;
    }

    public function getDefinitions(): array
    {
        $definitions = [];
        foreach ($this->types as $type) {
            $definitions[] = [
                'type' => $type->getType(),
                'category' => $type->getCategory(),
                'label' => $type->getLabel(),
                'unlimitedInputs' => $type->acceptsUnlimitedInputs(),
                'hasOutput' => $type->hasOutput(),
                'settings' => $type->getSettingDefinitions(),
            ];
        }

        return $definitions;
    }
}
