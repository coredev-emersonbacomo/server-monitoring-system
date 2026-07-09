<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Agent extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'registered_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function identities(): HasMany
    {
        return $this->hasMany(AgentIdentity::class);
    }

    public function activeIdentity(): HasOne
    {
        return $this->hasOne(AgentIdentity::class)->where('status', 'active');
    }

    public function heartbeats(): HasMany
    {
        return $this->hasMany(Heartbeat::class);
    }

    public function configurations(): HasMany
    {
        return $this->hasMany(AgentConfiguration::class);
    }

    public function currentConfiguration(): HasOne
    {
        return $this->hasOne(AgentConfiguration::class)->latestOfMany();
    }

    public function commands(): HasMany
    {
        return $this->hasMany(AgentCommand::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function ports(): HasMany
    {
        return $this->hasMany(Port::class);
    }

    public function processes(): HasMany
    {
        return $this->hasMany(Process::class);
    }
}
