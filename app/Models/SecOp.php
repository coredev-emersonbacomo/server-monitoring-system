<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Coop;

class SecOp extends Model
{
    public function coop(): BelongsTo
    {
        return $this->belongsTo(Coop::class, 'coop_id');
    }
    public function User(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

}
