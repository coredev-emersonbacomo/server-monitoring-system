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
use Carbon\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use App\Enums\RecordStatus;
use App\Enums\ServerHealth;

class Server extends Model
{
    use HasFactory, Notifiable, HasUuids, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty();
    }


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
