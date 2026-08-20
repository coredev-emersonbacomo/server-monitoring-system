<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Process extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'last_seen' => 'datetime',
        'cpu' => 'double',
        'memory' => 'double',
        'pids' => 'array',
    ];

    /** Number of grouped processes, derived from the pid list. */
    public function getCountAttribute(): int
    {
        return count($this->pids ?? []);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
