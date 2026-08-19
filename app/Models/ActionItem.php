<?php

namespace App\Models;

use App\Enums\ActionItemSeverity;
use App\Enums\ActionItemStatus;
use App\Events\ActionItemsUpdated;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;

class ActionItem extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'severity' => ActionItemSeverity::class,
            'status' => ActionItemStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::saved(function ($actionItem) {
            try {
                event(new ActionItemsUpdated);
            } catch (\Throwable $e) {
                Log::warning('[action-items] Broadcast failed', ['error' => $e->getMessage()]);
            }
        });

        static::deleted(function ($actionItem) {
            try {
                event(new ActionItemsUpdated);
            } catch (\Throwable $e) {
                Log::warning('[action-items] Broadcast failed', ['error' => $e->getMessage()]);
            }
        });
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class, 'server_id', 'id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id', 'id');
    }
}
