<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use App\Models\Role;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;

#[Fillable(['first_name', 'last_name', 'email', 'password', 'username', 'role_id', 'phone_number', 'status', 'profile_picture_url', 'profile_picture_public_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
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
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function clients(): BelongsToMany
    {
        return $this->belongsToMany(Client::class, 'sec_op_clients', 'user_id', 'client_id', 'uuid');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(UserSession::class, 'user_id');
    }

    public function activeSessions(): HasMany
    {
        return $this->sessions()
            ->whereNull('revoked_at')
            ->whereNull('compromised_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuthAuditLog::class, 'user_id');
    }
}
