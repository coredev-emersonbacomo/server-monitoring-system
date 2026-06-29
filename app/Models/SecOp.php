<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Client;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;
class SecOp extends Model
{
    use HasUuids;
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }
    public function User(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
     public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
    
}
