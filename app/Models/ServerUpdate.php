<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Server;
use Illuminate\Database\Eloquent\Relations\BelongsTo;


class ServerUpdate extends Model
{
     
     public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class, 'server_id');
    }
    
}
