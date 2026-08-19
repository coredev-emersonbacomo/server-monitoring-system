<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AgentLog extends Model
{
    protected $table = 'activity_logs';

    protected $casts = [
        'details' => 'array',
    ];

    protected $fillable = [
        'type',
        'logable_type',
        'logable_id',
        'user_id',
        'user',
        'action',
        'title',
        'details',
        'severity',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->type)) {
                $model->type = 'agent';
            }
        });
    }

    public function logable(): MorphTo
    {
        return $this->morphTo();
    }

    public function PerformerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
