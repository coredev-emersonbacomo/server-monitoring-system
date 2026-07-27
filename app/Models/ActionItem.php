<?php

namespace App\Models;

use App\Enums\ActionItemSeverity;
use App\Enums\ActionItemStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActionItem extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'severity' => ActionItemSeverity::class,
            'status'   => ActionItemStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::saved(function ($actionItem) {
            event(new \App\Events\ActionItemsUpdated());
        });

        static::deleted(function ($actionItem) {
            event(new \App\Events\ActionItemsUpdated());
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
