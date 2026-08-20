<?php

namespace App\Models;

use App\Enums\ServerStatus;
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
        'revoked_at' => 'datetime',
        'available_processes' => 'array',
        'available_ports' => 'array',
    ];

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function server(): BelongsTo
    {
        // Legacy "primary/last server" pointer. New code should use servers().
        return $this->belongsTo(Server::class);
    }

    public function servers(): HasMany
    {
        return $this->hasMany(Server::class, 'agent_id');
    }

    public function monitoredServers(): HasMany
    {
        return $this->hasMany(Server::class, 'agent_id')
            ->where('agent_deleted', false)
            ->where('status', '!=', ServerStatus::Archived->value);
    }

    public function identities(): HasMany
    {
        return $this->hasMany(AgentIdentity::class);
    }

    public function activeIdentity(): HasOne
    {
        return $this->hasOne(AgentIdentity::class)->where('status', 'active');
    }

    public function challenges(): HasMany
    {
        return $this->hasMany(AgentChallenge::class);
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
