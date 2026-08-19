<?php

namespace App\Models;

use App\Enums\SessionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserSession extends Model
{
    use HasFactory;

    protected $table = 'user_sessions';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'remember_me' => 'boolean',
            'last_activity_at' => 'datetime',
            'last_refresh_at' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'compromised_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function refreshTokenRotations(): HasMany
    {
        return $this->hasMany(RefreshTokenRotation::class, 'session_id');
    }

    public function isActive(): bool
    {
        return $this->revoked_at === null
            && $this->compromised_at === null
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isCompromised(): bool
    {
        return $this->compromised_at !== null;
    }

    public function status(): SessionStatus
    {
        if ($this->compromised_at !== null) {
            return SessionStatus::Compromised;
        }

        if ($this->revoked_at !== null) {
            return SessionStatus::Revoked;
        }

        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return SessionStatus::Expired;
        }

        return SessionStatus::Active;
    }

    public function touchActivity(): void
    {
        $this->update(['last_activity_at' => now()]);
    }

    public function revoke(): void
    {
        $this->update(['revoked_at' => now()]);
    }

    public function compromise(?string $reason = null): void
    {
        $this->update([
            'compromised_at' => now(),
            'compromise_reason' => $reason,
            'revoked_at' => now(),
        ]);
    }

    public function isCurrentSession(string $sessionUuid): bool
    {
        return $this->session_uuid === $sessionUuid;
    }
}
