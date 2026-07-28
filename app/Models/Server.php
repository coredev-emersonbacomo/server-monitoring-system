<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Carbon\Carbon;
use App\Enums\RecordStatus;
use App\Enums\ServerHealth;
use App\Enums\ServerStatus;
use App\Models\Setting;
use App\Models\Activity;

class Server extends Model
{
    use HasFactory, Notifiable, HasUuids;

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    protected $guarded = [];

    protected $hidden = [];

    protected function casts(): array
    {
        return [
            'record_status' => RecordStatus::class,
            'archived_at' => 'datetime',
            'monthly_cost' => 'float',
            'cost_offset' => 'float',
            'cost_reset_at' => 'datetime',
            'online_seconds' => 'integer',
            'historical_cost' => 'float',
            'accumulated_cost' => 'float',
            'pending_monthly_cost' => 'float',
            'rate_updated_at' => 'datetime',
            'went_offline_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id', 'id');
    }

    public function agent(): HasOne
    {
        return $this->hasOne(Agent::class);
    }

    public function provisionTokens(): HasMany
    {
        return $this->hasMany(ProvisionToken::class);
    }

    public function activeProvisionToken(): HasOne
    {
        return $this->hasOne(ProvisionToken::class)->where('status', 'active');
    }

    public function installations(): HasMany
    {
        return $this->hasMany(AgentInstallation::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    // Retaining old relations/methods just in case they're referenced elsewhere
    public function updates(): HasMany
    {
        return $this->hasMany(ServerUpdate::class, 'server_id');
    }

    public function latestUpdate(): HasOne
    {
        return $this->hasOne(ServerUpdate::class, 'server_id')->latestOfMany('created_at');
    }

    public static function computeHealth(?Carbon $lastSeen, int $offlineThresholdMs = 15000): ServerHealth
    {
        if ($lastSeen === null || $lastSeen->lessThan(now()->subMilliseconds($offlineThresholdMs))) {
            return ServerHealth::Offline;
        }

        return ServerHealth::Online;
    }

    protected function health(): Attribute
    {
        return Attribute::get(function () {
            $lastSeen = $this->agent?->last_seen_at;
            $threshold = (int) Setting::get('offline_threshold', '15000');
            return self::computeHealth($lastSeen, $threshold);
        });
    }

    public function checkTokenExpiration(): void
    {
        if ($this->status === ServerStatus::WaitingForInstallation->value) {
            $activeToken = $this->activeProvisionToken;
            if (!$activeToken || $activeToken->isExpired()) {
                $this->update(['status' => ServerStatus::PendingInstallation->value]);

                if ($activeToken) {
                    $activeToken->update(['status' => 'expired']);
                }

                CustomActivityLog::create([
                    'logable_type' => get_class($this),
                    'logable_id' => $this->id,
                    'user_id' => null,
                    'user' => 'System',
                    'action' => 'Token Expired',
                    'details' => json_encode([
                        'message' => "Installation token expired for server: {$this->name}. Status reverted to Pending Installation.",
                        'server_name' => $this->name,
                    ]),
                ]);
            }
        }
    }
}
