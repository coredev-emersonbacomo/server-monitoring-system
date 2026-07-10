<?php

namespace App\NodeConfig\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NodeConfig extends Model
{
    protected $table = 'node_configs';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'compiled_config' => 'array',
            'enabled' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getParsedConfig(): array
    {
        return $this->config ?? ['nodes' => [], 'edges' => []];
    }
}
