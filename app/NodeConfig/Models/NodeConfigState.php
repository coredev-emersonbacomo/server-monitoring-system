<?php

namespace App\NodeConfig\Models;

use Illuminate\Database\Eloquent\Model;

class NodeConfigState extends Model
{
    protected $table = 'node_config_states';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'output_value' => 'array',
            'context' => 'array',
        ];
    }
}
