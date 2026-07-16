<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AgentVersion extends Model
{
    protected $fillable = [
        'version',
        'binary_url',
        'description',
    ];
}
