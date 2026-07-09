<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetricBatch extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function heartbeat(): BelongsTo
    {
        return $this->belongsTo(Heartbeat::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function samples(): HasMany
    {
        return $this->hasMany(MetricSample::class, 'batch_id');
    }
}
