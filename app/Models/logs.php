<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class logs extends Model
{
    protected $table = "";
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
