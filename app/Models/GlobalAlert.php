<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlobalAlert extends Model
{
    protected $fillable = [
        'metric',
        'name',
        'threshold',
        'severity',
        'channels',
        'enabled',
    ];

    protected $casts = [
        'channels' => 'array',
        'enabled' => 'boolean',
        'threshold' => 'integer',
    ];
}