<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Client;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Server extends Model
{
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

   
}
