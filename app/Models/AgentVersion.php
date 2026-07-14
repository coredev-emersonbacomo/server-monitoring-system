<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AgentVersion extends Model
{
    protected $fillable = [
        'version',
        'type',
        'heartbeat_interval',
        'binary_url',
        'description',
    ];
}
