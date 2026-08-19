<?php

namespace App\Models;

use App\Enums\UploadIntentStatus;
use App\Enums\UploadPurpose;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class UploadIntent extends Model
{
    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'purpose',
        'storage_provider',
        'storage_key',
        'status',
        'attached_to_type',
        'attached_to_id',
        'attached_at',
        'expires_at',
        'metadata',
        'provider_response',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'string',
            'purpose' => UploadPurpose::class,
            'status' => UploadIntentStatus::class,
            'attached_at' => 'datetime',
            'expires_at' => 'datetime',
            'metadata' => 'array',
            'provider_response' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function attachedTo(): MorphTo
    {
        return $this->morphTo('attached_to');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isPending(): bool
    {
        return $this->status === UploadIntentStatus::PENDING;
    }

    public function scopePending($query)
    {
        return $query->where('status', UploadIntentStatus::PENDING);
    }

    public function scopeExpired($query)
    {
        return $query->where('status', UploadIntentStatus::PENDING)
            ->where('expires_at', '<', now());
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForPurpose($query, UploadPurpose $purpose)
    {
        return $query->where('purpose', $purpose->value);
    }
}
