<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Coop;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Server extends Model
{
    public function coop(): BelongsTo
    {
        return $this->belongsTo(Coop::class, 'coop_id');
    }

   
}
