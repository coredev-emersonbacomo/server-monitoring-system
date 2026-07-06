<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Server;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ServerUpdate extends Model
{
    use HasFactory;

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
