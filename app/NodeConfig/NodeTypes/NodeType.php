<?php

namespace App\NodeConfig\NodeTypes;

interface NodeType
{
    public function getType(): string;
    public function getCategory(): string;
    public function getLabel(): string;
    public function acceptsUnlimitedInputs(): bool;
    public function hasOutput(): bool;
    public function getSettingDefinitions(): array;
    public function evaluate(array $inputValues, array $settings, array $state): NodeResult;
}
