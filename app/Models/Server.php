<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Client;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;

class Server extends Model
{
    use HasFactory, HasUuids;
    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
    public function uniqueIds(): array
    {
        return ['uuid'];
    }
    protected $guarded = [];

    protected $hidden = [
        'ssh_password',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }
}
