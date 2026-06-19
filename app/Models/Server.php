<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Client;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Server extends Model
{
        use HasFactory;

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

   
}
