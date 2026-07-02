<?php

namespace App\Models;

use App\Enums\ServerHealth;
use App\Enums\RecordStatus;
use Illuminate\Database\Eloquent\Model;
use App\Models\Client;
use App\Models\ServerUpdate;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Carbon;
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
        'ssh_username',
    ];

    protected function casts(): array
    {
        return [
            'record_status' => RecordStatus::class,
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id', 'id');
    }

    public function updates(): HasMany
    {
        return $this->hasMany(ServerUpdate::class, 'server_id');
    }

    public function latestUpdate(): HasOne
    {
        return $this->hasOne(ServerUpdate::class, 'server_id')->latestOfMany('created_at');
    }

    public static function computeHealth(?Carbon $lastSeen, Carbon $onlineThreshold, Carbon $warningThreshold): ServerHealth
    {
        if ($lastSeen === null || $lastSeen->lessThan($warningThreshold)) {
            return ServerHealth::Offline;
        }

        if ($lastSeen->greaterThanOrEqualTo($onlineThreshold)) {
            return ServerHealth::Online;
        }

        return ServerHealth::Warning;
    }
}
