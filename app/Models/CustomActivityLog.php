<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CustomActivityLog extends Model
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
        'details',
    ];

    public function logable(): MorphTo
    {
        return $this->morphTo();
    }

    public function PerformerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
