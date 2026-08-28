<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AgentLifecycleEvent extends Model
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

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
        ];
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function scopeStarted(Builder $query): Builder
    {
        return $query->where('event_type', 'started');
    }

    public function scopeGraceful(Builder $query): Builder
    {
        return $query->whereIn('event_type', ['stopping', 'stopped']);
    }

    public function scopeUnexpected(Builder $query): Builder
    {
        return $query->where('event_type', 'unexpectedly_disconnected');
    }
}
