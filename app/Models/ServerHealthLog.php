<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServerHealthLog extends Model
{
    protected $table = 'server_health_logs';

    protected $casts = [
        'details' => 'array',
    ];

    protected $fillable = [
        'logable_type',
        'logable_id',
        'user_id',
        'user',
        'title',
        'details',
        'severity',
    ];

    public function logable(): MorphTo
    {
        return $this->morphTo();
    }

    public function PerformerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
