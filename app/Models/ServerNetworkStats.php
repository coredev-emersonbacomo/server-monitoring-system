<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServerNetworkStats extends Model
{
    protected $guarded = [];

    public $incrementing = false;

    public function getKeyName(): string
    {
        return 'created_at';
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class, 'server_id');
    }
}
