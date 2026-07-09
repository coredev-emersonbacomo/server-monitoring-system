<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Heartbeat extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'agent_time' => 'datetime',
        'received_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(MetricBatch::class);
    }
}
